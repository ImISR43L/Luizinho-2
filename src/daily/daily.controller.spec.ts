import { Test, TestingModule } from '@nestjs/testing';
import { DailyController } from './daily.controller';
import { DailyService } from './daily.service';
import { Request } from 'express';
import { CreateDailyDto, UpdateDailyDto } from './dto/daily.dto';

const mockDailyService = {
  create: jest.fn(),
  findAllForUser: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  complete: jest.fn(),
};

const mockUser = { id: 'user-1' };
const mockRequest = { user: mockUser } as unknown as Request;

describe('DailyController', () => {
  let controller: DailyController;
  let service: DailyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailyController],
      providers: [{ provide: DailyService, useValue: mockDailyService }],
    }).compile();

    controller = module.get<DailyController>(DailyController);
    service = module.get<DailyService>(DailyService);
    jest.clearAllMocks();
  });

  it('create should call service.create with correct dto and user id', async () => {
    const dto = new CreateDailyDto();
    await controller.create(dto, mockRequest);
    expect(service.create).toHaveBeenCalledWith(dto, mockUser.id);
  });

  it('findAll should call service.findAllForUser with correct user id', async () => {
    await controller.findAll(mockRequest);
    expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
  });

  it('findOne should call service.findOne with correct id and user id', async () => {
    const dailyId = 'daily-123';
    await controller.findOne(dailyId, mockRequest);
    expect(service.findOne).toHaveBeenCalledWith(dailyId, mockUser.id);
  });

  it('update should call service.update with correct id, dto, and user id', async () => {
    const dailyId = 'daily-123';
    const dto = new UpdateDailyDto();
    await controller.update(dailyId, dto, mockRequest);
    expect(service.update).toHaveBeenCalledWith(dailyId, dto, mockUser.id);
  });

  it('remove should call service.remove with correct id and user id', async () => {
    const dailyId = 'daily-123';
    await controller.remove(dailyId, mockRequest);
    expect(service.remove).toHaveBeenCalledWith(dailyId, mockUser.id);
  });

  it('complete should call service.complete with correct id, dto, and user id', async () => {
    const dailyId = 'daily-123';
    const completeDto = { notes: 'test note' };
    await controller.complete(dailyId, mockRequest, completeDto); 
    expect(service.complete).toHaveBeenCalledWith(
      dailyId,
      mockUser.id,
      completeDto,
    );
  });
});
