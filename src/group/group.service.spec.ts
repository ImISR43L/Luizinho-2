import { Test, TestingModule } from '@nestjs/testing';
import { GroupService } from './group.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  Group,
  User,
  UserGroup,
  UserGroupRole,
  MembershipStatus,
} from '@prisma/client';


const mockOwner: User = {
  id: 'owner-1',
  gold: 1000,
  email: 'owner@a.com',
  username: 'owner',
  passwordHash: 'h',
  gems: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockAdmin: User = {
  id: 'admin-1',
  gold: 1000,
  email: 'admin@a.com',
  username: 'admin',
  passwordHash: 'h',
  gems: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockMember: User = {
  id: 'member-1',
  gold: 1000,
  email: 'member@a.com',
  username: 'member',
  passwordHash: 'h',
  gems: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockGroup: Group = {
  id: 'group-1',
  name: 'Test Group',
  description: 'Desc',
  isPublic: true,
  createdAt: new Date(),
};

const mockOwnerMembership: UserGroup = {
  id: 'ug-1',
  userId: 'owner-1',
  groupId: 'group-1',
  role: UserGroupRole.OWNER,
  status: MembershipStatus.ACTIVE,
  joinedAt: new Date(),
};
const mockAdminMembership: UserGroup = {
  id: 'ug-2',
  userId: 'admin-1',
  groupId: 'group-1',
  role: UserGroupRole.ADMIN,
  status: MembershipStatus.ACTIVE,
  joinedAt: new Date(),
};
const mockMemberMembership: UserGroup = {
  id: 'ug-3',
  userId: 'member-1',
  groupId: 'group-1',
  role: UserGroupRole.MEMBER,
  status: MembershipStatus.ACTIVE,
  joinedAt: new Date(),
};
const mockPendingMembership: UserGroup = {
  id: 'ug-4',
  userId: 'pending-1',
  groupId: 'group-1',
  role: UserGroupRole.MEMBER,
  status: MembershipStatus.PENDING,
  joinedAt: new Date(),
};


const mockPrisma = {
  group: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: { findUnique: jest.fn(), update: jest.fn() },
  userGroup: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest
    .fn()
    .mockImplementation(async (callback) => await callback(mockPrisma)),
};

describe('GroupService', () => {
  let service: GroupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<GroupService>(GroupService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a group and make the creator the OWNER', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockOwner);
      mockPrisma.group.findUnique.mockResolvedValue(null);
      mockPrisma.group.create.mockResolvedValue(mockGroup);

      await service.create({ name: 'Test Group' }, 'owner-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { gold: { decrement: 150 } } }),
      );
      expect(mockPrisma.group.create).toHaveBeenCalled();
      expect(mockPrisma.userGroup.create).toHaveBeenCalledWith({
        data: {
          userId: 'owner-1',
          groupId: mockGroup.id,
          role: UserGroupRole.OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });
    });

    it('should throw ConflictException if group name is taken', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(mockGroup);
      await expect(
        service.create({ name: 'Test Group' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('manageMemberRole', () => {
    it('should allow owner to promote a member to admin', async () => {
      mockPrisma.userGroup.findUnique.mockImplementation(({ where }) => {
        if (where.userId_groupId.userId === 'owner-1')
          return mockOwnerMembership;
        if (where.userId_groupId.userId === 'member-1')
          return mockMemberMembership;
        return null;
      });

      await service.manageMemberRole('group-1', 'owner-1', {
        targetUserId: 'member-1',
        newRole: UserGroupRole.ADMIN,
      });
      expect(mockPrisma.userGroup.update).toHaveBeenCalledWith({
        where: { id: mockMemberMembership.id },
        data: { role: UserGroupRole.ADMIN },
      });
    });

    it('should throw ForbiddenException when an admin tries to kick another admin', async () => {
      mockPrisma.userGroup.findUnique.mockImplementation(({ where }) => {
        if (where.userId_groupId.userId === 'admin-1')
          return mockAdminMembership;
        if (where.userId_groupId.userId === 'other-admin-1')
          return {
            ...mockAdminMembership,
            id: 'ug-5',
            userId: 'other-admin-1',
          };
        return null;
      });

      await expect(
        service.kickMember('group-1', 'admin-1', 'other-admin-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('kickMember', () => {
    it('should allow an owner to kick a member', async () => {
      mockPrisma.userGroup.findUnique.mockImplementation(({ where }) => {
        if (where.userId_groupId.userId === 'owner-1')
          return mockOwnerMembership;
        if (where.userId_groupId.userId === 'member-1')
          return mockMemberMembership;
        return null;
      });

      await service.kickMember('group-1', 'owner-1', 'member-1');
      expect(mockPrisma.userGroup.delete).toHaveBeenCalledWith({
        where: { id: mockMemberMembership.id },
      });
    });

    it('should throw ForbiddenException when a member tries to kick another member', async () => {
      mockPrisma.userGroup.findUnique.mockReturnValue(mockMemberMembership);
      await expect(
        service.kickMember('group-1', 'member-1', 'other-member-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
