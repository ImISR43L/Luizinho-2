import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeController } from './challenge.controller';
import { ChallengeService } from './challenge.service';
import { Request } from 'express';

const mockChallengeService = {
  create: jest.fn(),
  deleteChallenge: jest.fn(),
  approveRequest: jest.fn(),
  rejectRequest: jest.fn(),
  joinChallenge: jest.fn(),
};

const mockUser = { id: 'user-1' };
const mockRequest = { user: mockUser } as unknown as Request;

describe('ChallengeController', () => {
  let controller: ChallengeController;
  let service: ChallengeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChallengeController],
      providers: [
        { provide: ChallengeService, useValue: mockChallengeService },
      ],
    }).compile();

    controller = module.get<ChallengeController>(ChallengeController);
    service = module.get<ChallengeService>(ChallengeService);
    jest.clearAllMocks();
  });

  it('create should call service.create', async () => {
    const dto = { title: 'Test', description: 'Test', goal: 'Test' };
    await controller.create(dto, mockRequest);
    expect(service.create).toHaveBeenCalledWith(dto, mockUser.id);
  });

  it('deleteChallenge should call service.deleteChallenge', async () => {
    const challengeId = 'challenge-123';
    await controller.deleteChallenge(challengeId, mockRequest);
    expect(service.deleteChallenge).toHaveBeenCalledWith(
      challengeId,
      mockUser.id,
    );
  });

  it('approveRequest should call service.approveRequest', async () => {
    const userChallengeId = 'uc-123';
    await controller.approveRequest(userChallengeId, mockRequest);
    expect(service.approveRequest).toHaveBeenCalledWith(
      userChallengeId,
      mockUser.id,
    );
  });

  it('rejectRequest should call service.rejectRequest', async () => {
    const userChallengeId = 'uc-123';
    await controller.rejectRequest(userChallengeId, mockRequest);
    expect(service.rejectRequest).toHaveBeenCalledWith(
      userChallengeId,
      mockUser.id,
    );
  });
});
