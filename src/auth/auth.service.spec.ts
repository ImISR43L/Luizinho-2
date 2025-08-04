import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PetItem, User } from '@prisma/client';

const mockPrismaClient = {
  user: { create: jest.fn() },
  pet: { create: jest.fn() },
  petItem: { findMany: jest.fn() },
  userPetItem: { createMany: jest.fn() },
  $transaction: jest
    .fn()
    .mockImplementation(async (callback) => await callback(mockPrismaClient)),
};

const mockUserService = {
  findByEmailOrUsername: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
};

const mockDefaultBackgrounds: PetItem[] = [
  {
    id: 'bg-1',
    name: 'Default Room',
    description: '',
    type: 'CUSTOMIZATION',
    cost: 0,
    statEffect: null,
    effectValue: null,
    isPremium: false,
    equipmentSlot: 'BACKGROUND',
    imageUrl: '',
  },
  {
    id: 'bg-2',
    name: 'Sunny Meadow',
    description: '',
    type: 'CUSTOMIZATION',
    cost: 0,
    statEffect: null,
    effectValue: null,
    isPremium: false,
    equipmentSlot: 'BACKGROUND',
    imageUrl: '',
  },
];

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UserService;
  let jwtService: JwtService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('test-token') },
        },
        { provide: PrismaService, useValue: mockPrismaClient },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
    };
    const createdUser = {
      id: 'user-1',
      ...registerDto,
      passwordHash: 'hashed-password',
    };

    it('should successfully register a user, create a pet, and grant default backgrounds', async () => {
      jest.spyOn(userService, 'findByEmailOrUsername').mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
      mockPrismaClient.user.create.mockResolvedValue(createdUser);
      mockPrismaClient.petItem.findMany.mockResolvedValue(
        mockDefaultBackgrounds,
      );

      const result = await authService.register(registerDto);

      expect(userService.findByEmailOrUsername).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.username,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.pet.create).toHaveBeenCalledWith({
        data: {
          userId: createdUser.id,
          name: `${createdUser.username}'s Pet`,
        },
      });
      expect(prisma.userPetItem.createMany).toHaveBeenCalledWith({
        data: mockDefaultBackgrounds.map((item) => ({
          userId: createdUser.id,
          itemId: item.id,
        })),
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw ConflictException if username or email already exists', async () => {
      jest
        .spyOn(userService, 'findByEmailOrUsername')
        .mockResolvedValue(createdUser as any);
      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
    };

    it('should return user and access token on successful login', async () => {
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(user as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await authService.login(loginDto);

      expect(userService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        user.passwordHash,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        username: undefined,
        sub: user.id,
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(user as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);
      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
