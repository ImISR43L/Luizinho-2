import { Test, TestingModule } from '@nestjs/testing';
import { HabitService } from './habit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Difficulty, Habit, HabitType } from '@prisma/client';
import { startOfDay, subDays } from 'date-fns';


const mockUser = { id: 'user-1', gold: 500 };
const mockHabit: Habit = {
  id: 'habit-1',
  userId: 'user-1',
  title: 'Test Habit',
  notes: null,
  type: HabitType.POSITIVE,
  difficulty: Difficulty.MEDIUM,
  isPaused: false,
  positiveCounter: 5,
  negativeCounter: 2,
  currentStreak: 5,
  longestStreak: 10,
  goldRewardLockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  repeatDays: null,
  repeatFrequency: 'DAILY',
};


const mockPrisma = {
  habit: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  habitLog: { findFirst: jest.fn(), create: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
  pet: { update: jest.fn() },
  $transaction: jest
    .fn()
    .mockImplementation(async (callback) => await callback(mockPrisma)),
};

describe('HabitService', () => {
  let service: HabitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HabitService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<HabitService>(HabitService);
    jest.clearAllMocks();
  });

  describe('logHabit', () => {
    it('should start a new streak of 1 if there are no previous logs', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(mockHabit);
      mockPrisma.habitLog.findFirst.mockResolvedValue(null);

      await service.logHabit('habit-1', { completed: true }, 'user-1');

      expect(mockPrisma.habit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentStreak: 1 }),
        }),
      );
    });

    it('should continue a streak if the last log was yesterday', async () => {
      const yesterday = subDays(new Date(), 1);
      mockPrisma.habit.findUnique.mockResolvedValue(mockHabit);
      mockPrisma.habitLog.findFirst.mockResolvedValue({ date: yesterday });

      await service.logHabit('habit-1', { completed: true }, 'user-1');

      expect(mockPrisma.habit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentStreak: mockHabit.currentStreak + 1,
          }),
        }),
      );
    });

    it('should start a new streak of 1 if the last log was older than yesterday', async () => {
      const twoDaysAgo = subDays(new Date(), 2);
      mockPrisma.habit.findUnique.mockResolvedValue(mockHabit);
      mockPrisma.habitLog.findFirst.mockResolvedValue({ date: twoDaysAgo });

      await service.logHabit('habit-1', { completed: true }, 'user-1');

      expect(mockPrisma.habit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentStreak: 1 }),
        }),
      );
    });

    it('should NOT apply health or gold penalties for a negative log', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(mockHabit);
      mockPrisma.habitLog.findFirst.mockResolvedValue(null);

      await service.logHabit('habit-1', { completed: false }, 'user-1');

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.pet.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if already logged today', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(mockHabit);
      mockPrisma.habitLog.findFirst.mockResolvedValue({ date: new Date() });

      await expect(
        service.logHabit('habit-1', { completed: true }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('handleStreakReset', () => {
    it('should reset streaks for habits missed yesterday', async () => {
      const twoDaysAgo = subDays(new Date(), 2);
      const missedHabit = {
        ...mockHabit,
        id: 'missed-1',
        currentStreak: 5,
        logs: [{ date: twoDaysAgo }],
      };
      mockPrisma.habit.findMany.mockResolvedValue([missedHabit]);

      await service.handleStreakReset();

      expect(mockPrisma.habit.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [missedHabit.id] } },
        data: { currentStreak: 0 },
      });
    });

    it('should NOT reset streaks for habits logged yesterday', async () => {
      const yesterday = subDays(new Date(), 1);
      const loggedHabit = {
        ...mockHabit,
        id: 'logged-1',
        logs: [{ date: yesterday }],
      };
      mockPrisma.habit.findMany.mockResolvedValue([loggedHabit]);

      await service.handleStreakReset();

      expect(mockPrisma.habit.updateMany).not.toHaveBeenCalled();
    });
  });
});
