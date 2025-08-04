
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChallengeDto } from './dto/challenge.dto';
import { ChallengeStatus, MembershipStatus } from '@prisma/client';

const CREATE_CHALLENGE_COST = 150;

@Injectable()
export class ChallengeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createChallengeDto: CreateChallengeDto, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (user.gold < CREATE_CHALLENGE_COST) {
      throw new ForbiddenException(
        `You need ${CREATE_CHALLENGE_COST} gold to create a challenge.`,
      );
    }


    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: CREATE_CHALLENGE_COST } },
      });

      const newChallenge = await tx.challenge.create({
        data: {
          ...createChallengeDto,
          creatorId: userId,
        },
      });

      await tx.userChallenge.create({
        data: {
          userId,
          challengeId: newChallenge.id,
          status: MembershipStatus.ACTIVE,
        },
      });

      return newChallenge;
    });
  }

  async deleteChallenge(challengeId: string, userId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException(
        `Challenge with ID "${challengeId}" not found.`,
      );
    }

    if (challenge.creatorId !== userId) {
      throw new ForbiddenException(
        'Only the creator can delete the challenge.',
      );
    }

    await this.prisma.challenge.delete({ where: { id: challengeId } });
    return { message: 'Challenge deleted successfully.' };
  }

  async findAllPublic() {
    return this.prisma.challenge.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id },
      include: {
        participants: {
          select: {
            id: true,
            status: true,
            user: {
              select: { id: true, username: true },
            },
            progress: true,
            completed: true,
          },
        },
      },
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${id}" not found.`);
    }
    return challenge;
  }

  async joinChallenge(challengeId: string, userId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) {
      throw new NotFoundException(
        `Challenge with ID "${challengeId}" not found.`,
      );
    }

    const alreadyJoined = await this.prisma.userChallenge.findFirst({
      where: { userId, challengeId },
    });
    if (alreadyJoined) {
      throw new ConflictException(
        'You have already joined this challenge or have a pending request.',
      );
    }

    const status = challenge.isPrivate
      ? MembershipStatus.PENDING
      : MembershipStatus.ACTIVE;

    return this.prisma.userChallenge.create({
      data: {
        userId,
        challengeId,
        status,
      },
    });
  }

  async approveRequest(userChallengeId: string, currentUserId: string) {
    const participation = await this.prisma.userChallenge.findUnique({
      where: { id: userChallengeId },
      include: { challenge: true },
    });

    if (!participation) {
      throw new NotFoundException('Participation request not found.');
    }
    if (participation.challenge.creatorId !== currentUserId) {
      throw new ForbiddenException(
        'Only the challenge owner can approve requests.',
      );
    }
    if (participation.status !== MembershipStatus.PENDING) {
      throw new ConflictException('This request is not pending approval.');
    }

    return this.prisma.userChallenge.update({
      where: { id: userChallengeId },
      data: { status: MembershipStatus.ACTIVE },
    });
  }

  async rejectRequest(userChallengeId: string, currentUserId: string) {
    const participation = await this.prisma.userChallenge.findUnique({
      where: { id: userChallengeId },
      include: { challenge: true },
    });

    if (!participation) {
      throw new NotFoundException('Participation request not found.');
    }
    if (participation.challenge.creatorId !== currentUserId) {
      throw new ForbiddenException(
        'Only the challenge owner can reject requests.',
      );
    }

    await this.prisma.userChallenge.delete({ where: { id: userChallengeId } });
    return { message: 'Request rejected.' };
  }

  async findUserChallenges(userId: string) {
    return this.prisma.userChallenge.findMany({
      where: { userId },
      include: {
        challenge: true,
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async updateUserChallengeProgress(
    userChallengeId: string,
    progress: number,
    userId: string,
  ) {
    const userChallenge = await this.prisma.userChallenge.findUnique({
      where: { id: userChallengeId },
    });

    if (!userChallenge) {
      throw new NotFoundException(
        `Challenge participation with ID "${userChallengeId}" not found.`,
      );
    }
    if (userChallenge.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this challenge progress.',
      );
    }

    return this.prisma.userChallenge.update({
      where: { id: userChallengeId },
      data: { progress },
    });
  }

  async leaveChallenge(userChallengeId: string, userId: string) {
    const userChallenge = await this.prisma.userChallenge.findUnique({
      where: { id: userChallengeId },
    });

    if (!userChallenge) {
      throw new NotFoundException(
        `Challenge participation with ID "${userChallengeId}" not found.`,
      );
    }
    if (userChallenge.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to leave this challenge.',
      );
    }

    await this.prisma.userChallenge.delete({
      where: { id: userChallengeId },
    });
  }

  async startChallenge(challengeId: string, userId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException(
        `Challenge with ID "${challengeId}" not found.`,
      );
    }

    if (challenge.creatorId !== userId) {
      throw new ForbiddenException('Only the creator can start the challenge.');
    }

    if (challenge.status !== ChallengeStatus.PENDING) {
      throw new ConflictException('This challenge has already started.');
    }

    return this.prisma.challenge.update({
      where: { id: challengeId },
      data: {
        status: ChallengeStatus.ACTIVE,
        startTime: new Date(),
      },
    });
  }

  async completeChallenge(userChallengeId: string, userId: string) {
    const userChallenge = await this.prisma.userChallenge.findUnique({
      where: { id: userChallengeId },
      include: { challenge: true },
    });

    if (!userChallenge) {
      throw new NotFoundException(
        `Challenge participation with ID "${userChallengeId}" not found.`,
      );
    }

    if (userChallenge.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to complete this challenge.',
      );
    }

    if (userChallenge.challenge.status !== ChallengeStatus.ACTIVE) {
      throw new ConflictException('This challenge is not active.');
    }

    const completionTime =
      (new Date().getTime() -
        new Date(userChallenge.challenge.startTime as Date).getTime()) /
      1000;

    await this.prisma.user.update({
      where: { id: userId },
      data: { gold: { increment: 30 } },
    });

    return this.prisma.userChallenge.update({
      where: { id: userChallengeId },
      data: {
        completed: true,
        completionTime,
      },
    });
  }

  async getLeaderboard(challengeId: string) {
    return this.prisma.userChallenge.findMany({
      where: {
        challengeId,
        completed: true,
      },
      orderBy: {
        completionTime: 'asc',
      },
      take: 10,
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });
  }

  async distributeRewards(challengeId: string, userId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException(
        `Challenge with ID "${challengeId}" not found.`,
      );
    }

    if (challenge.creatorId !== userId) {
      throw new ForbiddenException(
        'Only the creator can distribute rewards for the challenge.',
      );
    }

    const leaderboard = await this.getLeaderboard(challengeId);

    const rewards = [70, 60, 50, 40, 30, 30, 30, 30, 30, 30];

    for (let i = 0; i < leaderboard.length; i++) {
      const participant = leaderboard[i];
      const reward = rewards[i];

      await this.prisma.user.update({
        where: { id: participant.userId },
        data: { gold: { increment: reward } },
      });
    }

    return { message: 'Rewards distributed successfully.' };
  }
}
