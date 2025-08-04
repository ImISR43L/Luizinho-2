import { Test, TestingModule } from '@nestjs/testing';
import { DailyService } from './daily.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { Daily, Difficulty } from '@prisma/client';


const mockDaily: Daily = {
  id: 'daily-1',
  userId: 'user-1',
  title: 'Test Daily',
  notes: null,
  difficulty: Difficulty.EASY,
  completed: false, 
  lastCompleted: null,
  goldRewardLockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};


const mockPrisma = {
  daily: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  dailyLog: { create: jest.fn() },
  user: { update: jest.fn() },
  pet: { update: jest.fn() },
  $transaction: jest
    .fn()
    .mockImplementation(async (callback) => await callback(mockPrisma)),
};

describe('DailyService', () => {
  let service: DailyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<DailyService>(DailyService);
    jest.clearAllMocks();
  });

  describe('complete', () => {
    it('should complete a daily, create a log, and award gold', async () => {
      mockPrisma.daily.findUnique.mockResolvedValue(mockDaily);

      await service.complete('daily-1', 'user-1', { notes: 'test complete' });

      expect(mockPrisma.daily.update).toHaveBeenCalledWith({
        where: { id: 'daily-1' },
        data: { completed: true, lastCompleted: expect.any(Date) },
      });
      expect(mockPrisma.dailyLog.create).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.pet.update).toHaveBeenCalled();
    });

    it('should throw ConflictException if daily is already completed today', async () => {
      mockPrisma.daily.findUnique.mockResolvedValue({
        ...mockDaily,
        completed: true,
        lastCompleted: new Date(),
      });

      await expect(service.complete('daily-1', 'user-1', {})).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('handleDailyReset', () => {
    it('should reset the completed status of all dailies to false', async () => {
      await service.handleDailyReset();
      expect(mockPrisma.daily.updateMany).toHaveBeenCalledWith({
        where: { completed: true },
        data: { completed: false },
      });
    });
  });
});
