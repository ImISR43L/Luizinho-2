import { Test, TestingModule } from '@nestjs/testing';
import { HabitController } from './habit.controller';
import { HabitService } from './habit.service';
import { Request } from 'express';
import { CreateHabitDto, LogHabitDto, UpdateHabitDto } from './dto/habit.dto';

const mockHabitService = {
  create: jest.fn(),
  findAllForUser: jest.fn(),
  findOne: jest.fn(),
  logHabit: jest.fn(),
  update: jest.fn(),
  payToUpdate: jest.fn(),
  remove: jest.fn(),
  payToDelete: jest.fn(),
};

const mockUser = { id: 'user-1' };
const mockRequest = { user: mockUser } as unknown as Request;

describe('HabitController', () => {
  let controller: HabitController;
  let service: HabitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HabitController],
      providers: [{ provide: HabitService, useValue: mockHabitService }],
    }).compile();

    controller = module.get<HabitController>(HabitController);
    service = module.get<HabitService>(HabitService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should call service.create', async () => {
    const dto = new CreateHabitDto();
    await controller.create(dto, mockRequest);
    expect(service.create).toHaveBeenCalledWith(dto, mockUser.id);
  });

  it('findAll should call service.findAllForUser', async () => {
    await controller.findAll(mockRequest);
    expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
  });

  it('findOne should call service.findOne', async () => {
    const habitId = 'habit-id';
    await controller.findOne(habitId, mockRequest);
    expect(service.findOne).toHaveBeenCalledWith(habitId, mockUser.id);
  });

  it('logHabit should call service.logHabit', async () => {
    const habitId = 'habit-id';
    const dto = new LogHabitDto();
    await controller.logHabit(habitId, dto, mockRequest);
    expect(service.logHabit).toHaveBeenCalledWith(habitId, dto, mockUser.id);
  });

  it('update should call service.update', async () => {
    const habitId = 'habit-id';
    const dto = new UpdateHabitDto();
    await controller.update(habitId, dto, mockRequest);
    expect(service.update).toHaveBeenCalledWith(habitId, dto, mockUser.id);
  });

  it('payToUpdate should call service.payToUpdate', async () => {
    const habitId = 'habit-id';
    const dto = new UpdateHabitDto();
    await controller.payToUpdate(habitId, dto, mockRequest);
    expect(service.payToUpdate).toHaveBeenCalledWith(habitId, dto, mockUser.id);
  });

  it('remove should call service.remove', async () => {
    const habitId = 'habit-id';
    await controller.remove(habitId, mockRequest);
    expect(service.remove).toHaveBeenCalledWith(habitId, mockUser.id);
  });

  it('payToDelete should call service.payToDelete', async () => {
    const habitId = 'habit-id';
    await controller.payToDelete(habitId, mockRequest);
    expect(service.payToDelete).toHaveBeenCalledWith(habitId, mockUser.id);
  });
});
