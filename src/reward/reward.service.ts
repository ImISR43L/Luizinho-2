import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRewardDto, UpdateRewardDto } from './dto/reward.dto';

@Injectable()
export class RewardService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRewardDto: CreateRewardDto, userId: string) {
    return this.prisma.reward.create({
      data: {
        ...createRewardDto,
        userId: userId,
      },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.reward.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findOne(id: string, userId: string) {
    const reward = await this.prisma.reward.findUnique({ where: { id } });
    if (!reward) {
      throw new NotFoundException(`Reward with ID "${id}" not found.`);
    }
    if (reward.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this reward.',
      );
    }
    return reward;
  }

  async update(id: string, updateRewardDto: UpdateRewardDto, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.reward.update({
      where: { id },
      data: updateRewardDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.reward.delete({ where: { id } });
  }

  async redeem(rewardId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reward = await this.findOne(rewardId, userId);
      const user = await tx.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException('User not found.');
      }
      if (user.gold < reward.cost) {
        throw new ConflictException(
          `Not enough gold. You need ${reward.cost} gold but only have ${user.gold}.`,
        );
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: reward.cost } },
      });

      await tx.reward.update({
        where: { id: rewardId },
        data: { lastRedeemed: new Date() },
      });

      return {
        message: `Successfully redeemed "${reward.title}"!`,
        newGoldBalance: updatedUser.gold,
      };
    });
  }
}
