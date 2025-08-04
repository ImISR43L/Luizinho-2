import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CompleteDailyDto,
  CreateDailyDto,
  UpdateDailyDto,
} from './dto/daily.dto';
import { Difficulty } from '@prisma/client';
import { addDays, isToday } from 'date-fns';
import { Cron, CronExpression } from '@nestjs/schedule';

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
const DELETION_COSTS = {
  [Difficulty.HARD]: 300,
  [Difficulty.MEDIUM]: 100,
  [Difficulty.EASY]: 50,
  [Difficulty.TRIVIAL]: 25,
};

@Injectable()
export class DailyService {
  private readonly logger = new Logger(DailyService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(createDailyDto: CreateDailyDto, userId: string) {
    return this.prisma.daily.create({
      data: {
        ...createDailyDto,
        userId: userId,
      },
    });
  }

  async findAllForUser(userId: string) {
    const dailies = await this.prisma.daily.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return dailies.map((daily) => {
      if (daily.lastCompleted && !isToday(daily.lastCompleted)) {
        return { ...daily, completed: false };
      }
      return daily;
    });
  }

  async findOne(id: string, userId: string) {
    const daily = await this.prisma.daily.findUnique({ where: { id } });

    if (!daily) {
      throw new NotFoundException(`Daily task with ID "${id}" not found.`);
    }
    if (daily.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this daily task.',
      );
    }
    return daily;
  }

  async update(id: string, updateDailyDto: UpdateDailyDto, userId: string) {
    const daily = await this.findOne(id, userId);
    if (
      updateDailyDto.difficulty &&
      updateDailyDto.difficulty !== daily.difficulty
    ) {
      throw new ForbiddenException(
        'Difficulty must be changed via the pay-to-update endpoint.',
      );
    }
    return this.prisma.daily.update({ where: { id }, data: updateDailyDto });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.daily.delete({ where: { id } });
    return { message: 'Daily deleted successfully.' };
  }

  async payToDelete(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const daily = await this.findOne(id, userId);
      const user = await tx.user.findUnique({ where: { id: userId } });
      const cost = DELETION_COSTS[daily.difficulty];

      if (!user) throw new NotFoundException('User not found.');
      if (user.gold < cost) {
        throw new ConflictException(
          `You need ${cost} gold to delete this daily, but you only have ${user.gold}.`,
        );
      }

      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: cost } },
      });
      await tx.daily.delete({ where: { id } });
      return { message: `Successfully paid ${cost} gold to delete the daily.` };
    });
  }

  async payToUpdate(
    id: string,
    updateDailyDto: UpdateDailyDto,
    userId: string,
  ) {
    const { difficulty: newDifficulty } = updateDailyDto;
    if (!newDifficulty) {
      throw new BadRequestException('A new difficulty must be provided.');
    }
    return this.prisma.$transaction(async (tx) => {
      const daily = await tx.daily.findUnique({ where: { id } });
      if (!daily || daily.userId !== userId)
        throw new NotFoundException(`Daily with ID "${id}" not found.`);

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found.');

      const oldDifficulty = daily.difficulty;
      if (oldDifficulty === newDifficulty)
        throw new ConflictException('Cannot change to the same difficulty.');

      const oldLevel = DIFFICULTY_ORDER[oldDifficulty];
      const newLevel = DIFFICULTY_ORDER[newDifficulty];

      if (newLevel > oldLevel) {
        const lockDate = addDays(new Date(), 7);
        return tx.daily.update({
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
            `You need ${cost} gold, but only have ${user.gold}.`,
          );

        await tx.user.update({
          where: { id: userId },
          data: { gold: { decrement: cost } },
        });
        return tx.daily.update({
          where: { id },
          data: { difficulty: newDifficulty, goldRewardLockedUntil: null },
        });
      }
    });
  }

  async complete(
    dailyId: string,
    userId: string,
    completeDto: CompleteDailyDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const daily = await tx.daily.findUnique({ where: { id: dailyId } });
      if (!daily || daily.userId !== userId)
        throw new NotFoundException(
          `Daily task with ID "${dailyId}" not found.`,
        );
      if (daily.lastCompleted && isToday(daily.lastCompleted)) {
        throw new ConflictException(
          'This daily task has already been completed today.',
        );
      }

      const difficultyPoints = {
        [Difficulty.TRIVIAL]: 3,
        [Difficulty.EASY]: 6,
        [Difficulty.MEDIUM]: 12,
        [Difficulty.HARD]: 24,
      };
      let goldChange = 0;

      const isLocked =
        daily.goldRewardLockedUntil && new Date() < daily.goldRewardLockedUntil;
      if (!isLocked) {
        goldChange = difficultyPoints[daily.difficulty];
      }

      const happinessChange = 5;
      await tx.user.update({
        where: { id: userId },
        data: { gold: { increment: goldChange } },
      });
      await tx.pet.update({
        where: { userId },
        data: { happiness: { increment: happinessChange } },
      });

      await tx.dailyLog.create({
        data: {
          dailyId,
          userId,
          notes: completeDto.notes,
        },
      });

      const updatedDaily = await tx.daily.update({
        where: { id: dailyId },
        data: { completed: true, lastCompleted: new Date() },
      });

      return {
        message: 'Daily task completed!',
        daily: updatedDaily,
        goldChange,
      };
    });
  }

  async findLogsForDaily(dailyId: string, userId: string) {
    await this.findOne(dailyId, userId);

    return this.prisma.dailyLog.findMany({
      where: {
        dailyId: dailyId,
      },
      orderBy: {
        date: 'desc',
      },
      select: {
        date: true,
        notes: true,
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyReset() {
    this.logger.log('Resetting isCompleted status for all dailies...');
    await this.prisma.daily.updateMany({
      where: { completed: true },
      data: { completed: false },
    });
  }
}
