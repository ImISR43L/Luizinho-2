
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  CreateGroupMessageDto,
  ManageMemberDto,
} from './dto/group.dto';
import { UserGroupRole, MembershipStatus } from '@prisma/client';

const CREATE_GROUP_COST = 150;
const EDIT_GROUP_COST = 300;
const DELETE_GROUP_COST = 500;

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createGroupDto: CreateGroupDto, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (user.gold < CREATE_GROUP_COST) {
      throw new ForbiddenException(
        `You need ${CREATE_GROUP_COST} gold to create a group.`,
      );
    }

    const existingGroup = await this.prisma.group.findUnique({
      where: { name: createGroupDto.name },
    });
    if (existingGroup) {
      throw new ConflictException(
        `A group with the name "${createGroupDto.name}" already exists.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: CREATE_GROUP_COST } },
      });
      const newGroup = await tx.group.create({ data: createGroupDto });
      await tx.userGroup.create({
        data: {
          userId,
          groupId: newGroup.id,
          role: UserGroupRole.OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });
      return newGroup;
    });
  }

  async update(id: string, updateGroupDto: UpdateGroupDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.checkPermission(id, userId, [UserGroupRole.OWNER], tx);
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found.');
      if (user.gold < EDIT_GROUP_COST) {
        throw new ForbiddenException(
          `You need ${EDIT_GROUP_COST} gold to edit this group.`,
        );
      }
      if (updateGroupDto.name) {
        const existing = await tx.group.findFirst({
          where: { name: updateGroupDto.name, NOT: { id } },
        });
        if (existing)
          throw new ConflictException(
            `A group with name "${updateGroupDto.name}" already exists.`,
          );
      }
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: EDIT_GROUP_COST } },
      });
      return tx.group.update({ where: { id }, data: updateGroupDto });
    });
  }

  async deleteGroup(groupId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.checkPermission(groupId, userId, [UserGroupRole.OWNER], tx);
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found.');
      if (user.gold < DELETE_GROUP_COST) {
        throw new ForbiddenException(
          `You need ${DELETE_GROUP_COST} gold to delete this group.`,
        );
      }
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: DELETE_GROUP_COST } },
      });
      await tx.group.delete({ where: { id: groupId } });
      return { message: 'Group deleted successfully.' };
    });
  }

  async joinGroup(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group)
      throw new NotFoundException(`Group with ID "${groupId}" not found.`);
    const existingMembership = await this.prisma.userGroup.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (existingMembership)
      throw new ConflictException(
        'You are already a member or have a pending request for this group.',
      );

    const status = group.isPublic
      ? MembershipStatus.ACTIVE
      : MembershipStatus.PENDING;
    return this.prisma.userGroup.create({
      data: { userId, groupId, role: UserGroupRole.MEMBER, status },
    });
  }

  async leaveGroup(groupId: string, userId: string) {
    const membership = await this.prisma.userGroup.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership)
      throw new NotFoundException('You are not a member of this group.');
    if (membership.role === UserGroupRole.OWNER)
      throw new ForbiddenException(
        'Owners cannot leave the group. You must transfer ownership first.',
      );

    await this.prisma.userGroup.delete({ where: { id: membership.id } });
    return { message: 'You have left the group.' };
  }

  async approveRequest(
    groupId: string,
    targetUserId: string,
    currentUserId: string,
  ) {
    await this.checkPermission(groupId, currentUserId, [
      UserGroupRole.OWNER,
      UserGroupRole.ADMIN,
    ]);
    const request = await this.prisma.userGroup.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });
    if (!request || request.status !== MembershipStatus.PENDING) {
      throw new NotFoundException('No pending request found for this user.');
    }
    return this.prisma.userGroup.update({
      where: { userId_groupId: { userId: targetUserId, groupId } },
      data: { status: MembershipStatus.ACTIVE },
    });
  }

  async manageMemberRole(
    groupId: string,
    currentUserId: string,
    manageDto: ManageMemberDto,
  ) {
    const { targetUserId, newRole } = manageDto;
    return this.prisma.$transaction(async (tx) => {
      const currentUserMembership = await this.checkPermission(
        groupId,
        currentUserId,
        [UserGroupRole.OWNER, UserGroupRole.ADMIN],
        tx,
      );
      const targetUserMembership = await tx.userGroup.findUnique({
        where: { userId_groupId: { userId: targetUserId, groupId } },
      });
      if (!targetUserMembership)
        throw new NotFoundException(
          'Target user is not a member of this group.',
        );

      const isOwner = currentUserMembership.role === UserGroupRole.OWNER;


      switch (newRole) {
        case UserGroupRole.OWNER:
          if (!isOwner)
            throw new ForbiddenException(
              'Only the owner can transfer ownership.',
            );
          await tx.userGroup.update({
            where: { id: currentUserMembership.id },
            data: { role: UserGroupRole.ADMIN },
          });
          return tx.userGroup.update({
            where: { id: targetUserMembership.id },
            data: { role: UserGroupRole.OWNER },
          });

        case UserGroupRole.ADMIN:
          if (targetUserMembership.role === UserGroupRole.OWNER)
            throw new ForbiddenException('You cannot demote the owner.');
          return tx.userGroup.update({
            where: { id: targetUserMembership.id },
            data: { role: UserGroupRole.ADMIN },
          });

        case UserGroupRole.MEMBER:
          if (!isOwner)
            throw new ForbiddenException('Only the owner can demote an admin.');
          if (targetUserMembership.role !== UserGroupRole.ADMIN)
            throw new BadRequestException('This user is not an admin.');
          return tx.userGroup.update({
            where: { id: targetUserMembership.id },
            data: { role: UserGroupRole.MEMBER },
          });

        default:
          throw new BadRequestException('Invalid role change request.');
      }
    });
  }

  async postMessage(
    groupId: string,
    userId: string,
    createMessageDto: CreateGroupMessageDto,
  ) {
    const membership = await this.prisma.userGroup.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'You must be an active member of the group to post a message.',
      );
    }
    return this.prisma.groupMessage.create({
      data: { content: createMessageDto.content, groupId, userId },
      include: { user: { select: { id: true, username: true } } },
    });
  }

  async getMessages(groupId: string, userId: string) {
    const membership = await this.prisma.userGroup.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'You must be an active member of the group to view its messages.',
      );
    }
    return this.prisma.groupMessage.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, username: true } } },
    });
  }

  private async checkPermission(
    groupId: string,
    userId: string,
    allowedRoles: UserGroupRole[],
    tx?: any,
  ) {
    const prismaClient = tx || this.prisma;
    const membership = await prismaClient.userGroup.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (
      !membership ||
      !allowedRoles.includes(membership.role) ||
      membership.status !== 'ACTIVE'
    ) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }
    return membership;
  }

  async findAllDiscoverable() {
    return this.prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            role: true,
            status: true,
            user: { select: { id: true, username: true } },
          },
        },
      },
    });
    if (!group) throw new NotFoundException(`Group with ID "${id}" not found.`);
    return group;
  }

  async findUserGroups(userId: string) {
    return this.prisma.userGroup.findMany({
      where: { userId, status: MembershipStatus.ACTIVE },
      include: { group: true },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async kickMember(
    groupId: string,
    currentUserId: string,
    targetUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const currentUserMembership = await this.checkPermission(
        groupId,
        currentUserId,
        [UserGroupRole.OWNER, UserGroupRole.ADMIN],
        tx,
      );
      const targetUserMembership = await tx.userGroup.findUnique({
        where: { userId_groupId: { userId: targetUserId, groupId } },
      });

      if (!targetUserMembership)
        throw new NotFoundException(
          'Target user is not a member of this group.',
        );

      const isOwner = currentUserMembership.role === UserGroupRole.OWNER;
      const isAdmin = currentUserMembership.role === UserGroupRole.ADMIN;


      if (targetUserId === currentUserId)
        throw new ForbiddenException('You cannot kick yourself.');
      if (targetUserMembership.role === UserGroupRole.OWNER)
        throw new ForbiddenException('You cannot kick the owner.');
      if (isAdmin && targetUserMembership.role === UserGroupRole.ADMIN)
        throw new ForbiddenException('Admins cannot kick other admins.');

      await tx.userGroup.delete({ where: { id: targetUserMembership.id } });
      return { message: 'Member has been kicked from the group.' };
    });
  }
  async rejectRequest(
    groupId: string,
    targetUserId: string,
    currentUserId: string,
  ) {
    await this.checkPermission(groupId, currentUserId, [
      UserGroupRole.OWNER,
      UserGroupRole.ADMIN,
    ]);

    const request = await this.prisma.userGroup.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });

    if (!request || request.status !== MembershipStatus.PENDING) {
      throw new NotFoundException('No pending request found for this user.');
    }


    await this.prisma.userGroup.delete({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });

    return { message: 'Join request has been rejected.' };
  }
}
