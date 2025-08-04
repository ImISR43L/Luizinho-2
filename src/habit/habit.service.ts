import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHabitDto, UpdateHabitDto, LogHabitDto } from './dto/habit.dto';
import { HabitType, Difficulty } from '@prisma/client';
import { startOfDay, subDays, isSameDay, addDays } from 'date-fns';
import { Cron, CronExpression } from '@nestjs/schedule';

const DELETION_COSTS = {
  [Difficulty.HARD]: 300,
  [Difficulty.MEDIUM]: 100,
  [Difficulty.EASY]: 50,
  [Difficulty.TRIVIAL]: 25,
};
const DELETION_STREAKS = {
  [Difficulty.HARD]: 30,
  [Difficulty.MEDIUM]: 20,
  [Difficulty.EASY]: 10,
  [Difficulty.TRIVIAL]: 5,
};
const DIFFICULTY_CHANGE_COSTS = {
  HARD: { MEDIUM: 150, EASY: 200, TRIVIAL: 250 },
  MEDIUM: { EASY: 100, TRIVIAL: 50 },
  EASY: { TRIVIAL: 20 },
};
const DIFFICULTY_ORDER = {
  [Difficulty.TRIVIAL]: 0,
  [Difficulty.EASY]: 1,
  [Difficulty.MEDIUM]: 2,
  [Difficulty.HARD]: 3,
};

@Injectable()
export class HabitService {
  private readonly logger = new Logger(HabitService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleStreakReset() {
    this.logger.log('Running daily streak reset check...');
    const yesterday = startOfDay(subDays(new Date(), 1));

    const activeHabits = await this.prisma.habit.findMany({
      where: {
        isPaused: false,
        currentStreak: { gt: 0 },
      },
      include: {
        logs: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    const habitsToReset = activeHabits.filter((habit) => {
      if (habit.logs.length === 0) {
        return true;
      }
      const lastLogDate = habit.logs[0].date;

      return lastLogDate < yesterday;
    });

    if (habitsToReset.length > 0) {
      const idsToReset = habitsToReset.map((h) => h.id);
      await this.prisma.habit.updateMany({
        where: { id: { in: idsToReset } },
        data: { currentStreak: 0 },
      });
      this.logger.log(`Reset streaks for ${idsToReset.length} habits.`);
    } else {
      this.logger.log('No habits needed a streak reset.');
    }
  }

  async create(createHabitDto: CreateHabitDto, userId: string) {
    return this.prisma.habit.create({
      data: {
        ...createHabitDto,
        userId: userId,
      },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.habit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const habit = await this.prisma.habit.findUnique({ where: { id } });
    if (!habit) {
      throw new NotFoundException(`Habit with ID "${id}" not found.`);
    }
    if (habit.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this habit.',
      );
    }
    return habit;
  }

  async remove(id: string, userId: string) {
    const habit = await this.findOne(id, userId);
    const requiredStreak = DELETION_STREAKS[habit.difficulty];
    if (habit.currentStreak >= requiredStreak) {
      await this.prisma.habit.delete({ where: { id } });
      return {
        message: `Habit deleted for free after reaching a ${requiredStreak}-day streak!`,
      };
    } else {
      throw new ForbiddenException(
        `You need a streak of ${requiredStreak} to delete this habit for free. Alternatively, you can pay to delete it.`,
      );
    }
  }

  async payToDelete(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const habit = await this.findOne(id, userId);
      const user = await tx.user.findUnique({ where: { id: userId } });

      const cost = DELETION_COSTS[habit.difficulty];
      if (!user) throw new NotFoundException('User not found.');
      if (user.gold < cost) {
        throw new ConflictException(
          `You need ${cost} gold to delete this habit, but you only have ${user.gold}.`,
        );
      }
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: cost } },
      });
      await tx.habit.delete({ where: { id } });
      return { message: `Successfully paid ${cost} gold to delete the habit.` };
    });
  }

  async update(id: string, updateHabitDto: UpdateHabitDto, userId: string) {
    const habit = await this.findOne(id, userId);
    if (
      updateHabitDto.difficulty &&
      updateHabitDto.difficulty !== habit.difficulty
    ) {
      throw new ForbiddenException(
        'Difficulty must be changed via the pay-to-update endpoint.',
      );
    }
    return this.prisma.habit.update({ where: { id }, data: updateHabitDto });
  }

  async payToUpdate(
    id: string,
    updateHabitDto: UpdateHabitDto,
    userId: string,
  ) {
    const { difficulty: newDifficulty } = updateHabitDto;
    if (!newDifficulty) {
      throw new BadRequestException('A new difficulty must be provided.');
    }
    return this.prisma.$transaction(async (tx) => {
      const habit = await this.findOne(id, userId);
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found.');

      const oldDifficulty = habit.difficulty;
      if (oldDifficulty === newDifficulty)
        throw new ConflictException(
          'The new difficulty cannot be the same as the old one.',
        );

      const oldLevel = DIFFICULTY_ORDER[oldDifficulty];
      const newLevel = DIFFICULTY_ORDER[newDifficulty];

      if (newLevel > oldLevel) {
        const lockDate = addDays(new Date(), 7);
        return tx.habit.update({
          where: { id },
          data: { difficulty: newDifficulty, goldRewardLockedUntil: lockDate },
        });
      } else {
        const cost = DIFFICULTY_CHANGE_COSTS[oldDifficulty]?.[newDifficulty];
        if (cost === undefined)
          throw new BadRequestException(
            'This difficulty change is not allowed.',
          );
        if (user.gold < cost)
          throw new ConflictException(
            `You need ${cost} gold for this change, but you only have ${user.gold}.`,
          );
        await tx.user.update({
          where: { id: userId },
          data: { gold: { decrement: cost } },
        });
        return tx.habit.update({
          where: { id },
          data: { difficulty: newDifficulty, goldRewardLockedUntil: null },
        });
      }
    });
  }

  async logHabit(habitId: string, logHabitDto: LogHabitDto, userId: string) {
    const { completed, notes } = logHabitDto;
    return this.prisma.$transaction(async (tx) => {
      const habit = await this.findOne(habitId, userId);

      if (habit.isPaused)
        throw new ConflictException('Cannot log a paused habit.');

      const today = startOfDay(new Date());
      const mostRecentLog = await tx.habitLog.findFirst({
        where: { habitId },
        orderBy: { date: 'desc' },
      });

      if (mostRecentLog && isSameDay(mostRecentLog.date, today)) {
        throw new ConflictException(
          'This habit has already been logged today.',
        );
      }

      const difficultyPoints = {
        [Difficulty.TRIVIAL]: 2,
        [Difficulty.EASY]: 5,
        [Difficulty.MEDIUM]: 10,
        [Difficulty.HARD]: 20,
      };

      let goldChange = 0;
      let happinessChange = 0;
      const isLocked =
        habit.goldRewardLockedUntil &&
        new Date() < new Date(habit.goldRewardLockedUntil);

      if (completed) {
        if (!isLocked) {
          goldChange = difficultyPoints[habit.difficulty];
        }
        happinessChange = 5;
      }

      const yesterday = startOfDay(subDays(new Date(), 1));
      const lastLogWasYesterday =
        mostRecentLog && isSameDay(mostRecentLog.date, yesterday);

      let newStreak = lastLogWasYesterday ? habit.currentStreak + 1 : 1;

      if (goldChange > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { gold: { increment: goldChange } },
        });
      }

      if (happinessChange > 0) {
        await tx.pet.update({
          where: { userId },
          data: { happiness: { increment: happinessChange } },
        });
      }

      const updatedHabit = await tx.habit.update({
        where: { id: habitId },
        data: {
          positiveCounter: { increment: completed ? 1 : 0 },
          negativeCounter: { increment: completed ? 0 : 1 },
          currentStreak: newStreak,
          longestStreak: Math.max(habit.longestStreak, newStreak),
        },
      });

      await tx.habitLog.create({
        data: { habitId, userId, completed, notes, date: new Date() },
      });

      return {
        message: 'Habit logged successfully!',
        habit: updatedHabit,
        goldChange,
      };
    });
  }
}
