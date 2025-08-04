
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';


const mockUser: User = {
  id: 'user-id-123',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hashed-password',
  gold: 10,
  gems: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};


const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
};

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user object when a user is found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should throw a NotFoundException when a user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user object when found by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
    });

    it('should return null when a user with the email is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('non-existent@email.com');

      expect(result).toBeNull();
    });
  });

  describe('findByEmailOrUsername', () => {
    it('should call prisma.user.findFirst with the correct query', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      await service.findByEmailOrUsername(mockUser.email, mockUser.username);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: mockUser.email }, { username: mockUser.username }],
        },
      });
    });
  });
});
