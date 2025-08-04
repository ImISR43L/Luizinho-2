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
import { RewardService } from './reward.service';
import { CreateRewardDto, UpdateRewardDto } from './dto/reward.dto';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Rewards')
@ApiCookieAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('rewards')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Post()
  @ApiOperation({ summary: 'Create a custom reward' })
  create(@Body() createRewardDto: CreateRewardDto, @Req() req: Request) {
    return this.rewardService.create(createRewardDto, req.user['id']);
  }

  @Get()
  @ApiOperation({ summary: 'Get all of your custom rewards' })
  findAll(@Req() req: Request) {
    return this.rewardService.findAllForUser(req.user['id']);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reward' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRewardDto: UpdateRewardDto,
    @Req() req: Request,
  ) {
    return this.rewardService.update(id, updateRewardDto, req.user['id']);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a reward' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.rewardService.remove(id, req.user['id']);
  }

  @Post(':id/redeem')
  @ApiOperation({ summary: 'Redeem a reward by spending gold' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  redeem(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.rewardService.redeem(id, req.user['id']);
  }
}
