import { Test, TestingModule } from '@nestjs/testing';
import { RewardService } from './reward.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Reward, User } from '@prisma/client';

const mockUser: User = {
  id: 'user-1',
  email: 'a@a.com',
  username: 'a',
  passwordHash: 'h',
  gold: 100,
  gems: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockReward: Reward = {
  id: 'reward-1',
  userId: 'user-1',
  title: 'Test Reward',
  notes: null,
  cost: 50,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastRedeemed: null,
};

const mockPrisma = {
  reward: { findUnique: jest.fn(), update: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
  $transaction: jest
    .fn()
    .mockImplementation(async (callback) => await callback(mockPrisma)),
};

describe('RewardService', () => {
  let service: RewardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<RewardService>(RewardService);
    jest.clearAllMocks();
  });

  describe('redeem', () => {
    it('should redeem a reward, deduct gold, and update the lastRedeemed timestamp', async () => {
      mockPrisma.reward.findUnique.mockResolvedValue(mockReward);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, gold: 50 });

      const result = await service.redeem('reward-1', 'user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { gold: { decrement: 50 } },
      });

      expect(mockPrisma.reward.update).toHaveBeenCalledWith({
        where: { id: 'reward-1' },
        data: { lastRedeemed: expect.any(Date) },
      });
      expect(result.newGoldBalance).toBe(50);
    });

    it('should throw ConflictException if user cannot afford the reward', async () => {
      const poorUser = { ...mockUser, gold: 20 };
      mockPrisma.reward.findUnique.mockResolvedValue(mockReward);
      mockPrisma.user.findUnique.mockResolvedValue(poorUser);

      await expect(service.redeem('reward-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
