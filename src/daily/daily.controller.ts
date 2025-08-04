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
import { DailyService } from './daily.service';
import {
  CompleteDailyDto,
  CreateDailyDto,
  UpdateDailyDto,
} from './dto/daily.dto';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Dailies')
@ApiCookieAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dailies')
export class DailyController {
  constructor(private readonly dailyService: DailyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new daily task' })
  create(@Body() createDailyDto: CreateDailyDto, @Req() req: Request) {
    return this.dailyService.create(createDailyDto, req.user['id']);
  }

  @Get()
  @ApiOperation({ summary: 'Get all of your daily tasks' })
  findAll(@Req() req: Request) {
    return this.dailyService.findAllForUser(req.user['id']);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific daily by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.dailyService.findOne(id, req.user['id']);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update a daily task (e.g., title, notes). Does NOT handle difficulty changes.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDailyDto: UpdateDailyDto,
    @Req() req: Request,
  ) {
    return this.dailyService.update(id, updateDailyDto, req.user['id']);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a daily task' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.dailyService.remove(id, req.user['id']);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete a daily task for today' })
  @HttpCode(HttpStatus.OK)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Body() completeDto: CompleteDailyDto, 
  ) {
    return this.dailyService.complete(id, req.user['id'], completeDto);
  }

  @Patch(':id/pay-to-update')
  @ApiOperation({
    summary: "Pay gold to downgrade or freely upgrade a daily's difficulty",
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  payToUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDailyDto: UpdateDailyDto,
    @Req() req: Request,
  ) {
    return this.dailyService.payToUpdate(id, updateDailyDto, req.user['id']);
  }

  @Delete(':id/pay-to-delete')
  @ApiOperation({ summary: 'Pay gold to delete a daily' })
  @HttpCode(HttpStatus.OK)
  payToDelete(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.dailyService.payToDelete(id, req.user['id']);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get all completion logs for a specific daily' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findLogsForDaily(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.dailyService.findLogsForDaily(id, req.user['id']);
  }
}
