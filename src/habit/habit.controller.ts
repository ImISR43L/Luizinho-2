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
import { HabitService } from './habit.service';
import { CreateHabitDto, UpdateHabitDto, LogHabitDto } from './dto/habit.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Habits')
@ApiCookieAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('habits')
export class HabitController {
  constructor(private readonly habitService: HabitService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new habit' })
  create(@Body() createHabitDto: CreateHabitDto, @Req() req: Request) {
    return this.habitService.create(createHabitDto, req.user['id']);
  }

  @Get()
  @ApiOperation({ summary: 'Get all of your habits' })
  findAll(@Req() req: Request) {
    return this.habitService.findAllForUser(req.user['id']);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific habit by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.habitService.findOne(id, req.user['id']);
  }

  @Post(':id/log')
  @ApiOperation({ summary: 'Log a habit for today (+/-)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Habit successfully logged.' })
  @ApiResponse({ status: 409, description: 'Habit already logged today.' })
  @HttpCode(HttpStatus.OK)
  logHabit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() logHabitDto: LogHabitDto,
    @Req() req: Request,
  ) {
    return this.habitService.logHabit(id, logHabitDto, req.user['id']);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update a habit (e.g., title, notes). Does NOT handle difficulty changes.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateHabitDto: UpdateHabitDto,
    @Req() req: Request,
  ) {
    return this.habitService.update(id, updateHabitDto, req.user['id']);
  }

  @Patch(':id/pay-to-update')
  @ApiOperation({ summary: "Pay gold to change a habit's difficulty" })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  payToUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateHabitDto: UpdateHabitDto,
    @Req() req: Request,
  ) {
    return this.habitService.payToUpdate(id, updateHabitDto, req.user['id']);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a habit for free if streak requirement is met',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.habitService.remove(id, req.user['id']);
  }

  @Delete(':id/pay-to-delete')
  @ApiOperation({
    summary: 'Pay gold to delete a habit if streak requirement is not met',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  payToDelete(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.habitService.payToDelete(id, req.user['id']);
  }
}
