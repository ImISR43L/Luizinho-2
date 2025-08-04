import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ChallengeService } from './challenge.service';
import {
  CreateChallengeDto,
  UpdateUserChallengeDto,
} from './dto/challenge.dto';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Challenges')
@ApiCookieAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('challenges')
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new challenge' })
  create(@Body() createChallengeDto: CreateChallengeDto, @Req() req: Request) {
    return this.challengeService.create(createChallengeDto, req.user['id']);
  }

  @Get('/public')
  @ApiOperation({ summary: 'Find all public challenges' })
  findAllPublic() {
    return this.challengeService.findAllPublic();
  }

  @Get('/participation/mine')
  @ApiOperation({ summary: 'Get all challenges you have joined' })
  findMyChallenges(@Req() req: Request) {
    return this.challengeService.findUserChallenges(req.user['id']);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific challenge' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.challengeService.findOne(id);
  }


  @Delete(':id')
  @ApiOperation({ summary: 'Delete a challenge you created' })
  @HttpCode(HttpStatus.OK)
  deleteChallenge(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.challengeService.deleteChallenge(id, req.user['id']);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a challenge' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  joinChallenge(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.challengeService.joinChallenge(id, req.user['id']);
  }

  @Post('/participation/:userChallengeId/approve')
  @ApiOperation({ summary: 'Approve a pending join request (Owner only)' })
  @HttpCode(HttpStatus.OK)
  approveRequest(
    @Param('userChallengeId', ParseUUIDPipe) userChallengeId: string,
    @Req() req: Request,
  ) {
    return this.challengeService.approveRequest(
      userChallengeId,
      req.user['id'],
    );
  }

  @Delete('/participation/:userChallengeId/reject')
  @ApiOperation({ summary: 'Reject a pending join request (Owner only)' })
  @HttpCode(HttpStatus.OK)
  rejectRequest(
    @Param('userChallengeId', ParseUUIDPipe) userChallengeId: string,
    @Req() req: Request,
  ) {
    return this.challengeService.rejectRequest(userChallengeId, req.user['id']);
  }

  @Patch('/participation/:userChallengeId')
  @ApiOperation({ summary: 'Update your progress in a challenge' })
  @ApiParam({ name: 'userChallengeId', type: 'string', format: 'uuid' })
  updateProgress(
    @Param('userChallengeId', ParseUUIDPipe) userChallengeId: string,
    @Body() updateUserChallengeDto: UpdateUserChallengeDto,
    @Req() req: Request,
  ) {
    return this.challengeService.updateUserChallengeProgress(
      userChallengeId,
      updateUserChallengeDto.progress,
      req.user['id'],
    );
  }

  @Delete('/participation/:userChallengeId/leave')
  @ApiOperation({ summary: 'Leave a challenge you have joined' })
  @ApiParam({ name: 'userChallengeId', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.NO_CONTENT)
  leaveChallenge(
    @Param('userChallengeId', ParseUUIDPipe) userChallengeId: string,
    @Req() req: Request,
  ) {
    return this.challengeService.leaveChallenge(
      userChallengeId,
      req.user['id'],
    );
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a challenge you created' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  startChallenge(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.challengeService.startChallenge(id, req.user['id']);
  }

  @Post('/participation/:userChallengeId/complete')
  @ApiOperation({ summary: 'Mark a challenge as complete' })
  @ApiParam({ name: 'userChallengeId', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  completeChallenge(
    @Param('userChallengeId', ParseUUIDPipe) userChallengeId: string, 
    @Req() req: Request,
  ) {
    return this.challengeService.completeChallenge(
      userChallengeId,
      req.user['id'],
    );
  }

  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Get the leaderboard for a challenge' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getLeaderboard(@Param('id', ParseUUIDPipe) id: string) {
    return this.challengeService.getLeaderboard(id);
  }

  @Post(':id/distribute-rewards')
  @ApiOperation({ summary: 'Distribute rewards for a challenge' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  distributeRewards(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.challengeService.distributeRewards(id, req.user['id']);
  }
}
