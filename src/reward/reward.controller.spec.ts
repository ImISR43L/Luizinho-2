import { Test, TestingModule } from '@nestjs/testing';
import { RewardController } from './reward.controller';
import { RewardService } from './reward.service';
import { Request } from 'express';
import { CreateRewardDto, UpdateRewardDto } from './dto/reward.dto';

const mockRewardService = {
  create: jest.fn(),
  findAllForUser: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  redeem: jest.fn(),
};

const mockUser = { id: 'user-1' };
const mockRequest = { user: mockUser } as unknown as Request;

describe('RewardController', () => {
  let controller: RewardController;
  let service: RewardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RewardController],
      providers: [{ provide: RewardService, useValue: mockRewardService }],
    }).compile();

    controller = module.get<RewardController>(RewardController);
    service = module.get<RewardService>(RewardService);
    jest.clearAllMocks();
  });

  it('create should call service.create', async () => {
    const dto = new CreateRewardDto();
    await controller.create(dto, mockRequest);
    expect(service.create).toHaveBeenCalledWith(dto, mockUser.id);
  });

  it('findAll should call service.findAllForUser', async () => {
    await controller.findAll(mockRequest);
    expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
  });

  it('update should call service.update', async () => {
    const rewardId = 'reward-123';
    const dto = new UpdateRewardDto();
    await controller.update(rewardId, dto, mockRequest);
    expect(service.update).toHaveBeenCalledWith(rewardId, dto, mockUser.id);
  });

  it('remove should call service.remove', async () => {
    const rewardId = 'reward-123';
    await controller.remove(rewardId, mockRequest);
    expect(service.remove).toHaveBeenCalledWith(rewardId, mockUser.id);
  });

  it('redeem should call service.redeem', async () => {
    const rewardId = 'reward-123';
    await controller.redeem(rewardId, mockRequest);
    expect(service.redeem).toHaveBeenCalledWith(rewardId, mockUser.id);
  });
});
