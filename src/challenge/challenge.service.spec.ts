import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeService } from './challenge.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import {
  User,
  Challenge,
  UserChallenge,
  ChallengeStatus,
  MembershipStatus,
} from '@prisma/client';

const mockUser: User = {
  id: 'user-1',
  gold: 500,
  email: 'a@a.com',
  username: 'a',
  passwordHash: 'h',
  gems: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockChallenge: Challenge = {
  id: 'challenge-1',
  creatorId: 'user-1',
  title: 'Test Challenge',
  description: 'Desc',
  goal: 'Goal',
  isPublic: true,
  isPrivate: false,
  status: ChallengeStatus.PENDING,
  startTime: null,
  createdAt: new Date(),
};
const mockParticipation: UserChallenge = {
  id: 'uc-1',
  userId: 'user-2',
  challengeId: 'challenge-1',
  progress: 0,
  completed: false,
  joinedAt: new Date(),
  completionTime: null,
  status: MembershipStatus.PENDING,
};


const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  challenge: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  userChallenge: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest
    .fn()
    .mockImplementation(async (callback) => await callback(mockPrisma)),
};

describe('ChallengeService', () => {
  let service: ChallengeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengeService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ChallengeService>(ChallengeService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should deduct gold and create a challenge with the creator as a participant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.challenge.create.mockResolvedValue(mockChallenge);

      await service.create(
        { title: 'New Challenge', description: 'd', goal: 'g' },
        'user-1',
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { gold: { decrement: 150 } },
      });
      expect(mockPrisma.challenge.create).toHaveBeenCalled();
      expect(mockPrisma.userChallenge.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          challengeId: mockChallenge.id,
          status: MembershipStatus.ACTIVE,
        },
      });
    });

    it('should throw ForbiddenException if user has insufficient gold', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, gold: 100 });
      await expect(
        service.create(
          { title: 'New Challenge', description: 'd', goal: 'g' },
          'user-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteChallenge', () => {
    it('should allow the creator to delete their own challenge', async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue(mockChallenge);
      await service.deleteChallenge('challenge-1', 'user-1');
      expect(mockPrisma.challenge.delete).toHaveBeenCalledWith({
        where: { id: 'challenge-1' },
      });
    });

    it('should throw ForbiddenException if a non-creator tries to delete a challenge', async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue(mockChallenge);
      await expect(
        service.deleteChallenge('challenge-1', 'user-2'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('approveRequest', () => {
    it('should allow the owner to approve a pending request', async () => {
      mockPrisma.userChallenge.findUnique.mockResolvedValue({
        ...mockParticipation,
        challenge: mockChallenge,
      });
      await service.approveRequest('uc-1', 'user-1');
      expect(mockPrisma.userChallenge.update).toHaveBeenCalledWith({
        where: { id: 'uc-1' },
        data: { status: MembershipStatus.ACTIVE },
      });
    });

    it('should throw ForbiddenException if a non-owner tries to approve a request', async () => {
      mockPrisma.userChallenge.findUnique.mockResolvedValue({
        ...mockParticipation,
        challenge: mockChallenge,
      });
      await expect(service.approveRequest('uc-1', 'user-2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
