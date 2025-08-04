import { Test, TestingModule } from '@nestjs/testing';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { Request } from 'express';
import {
  CreateGroupDto,
  CreateGroupMessageDto,
  ManageMemberDto,
} from './dto/group.dto';

const mockGroupService = {
  create: jest.fn(),
  findAllDiscoverable: jest.fn(),
  findUserGroups: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  deleteGroup: jest.fn(),
  joinGroup: jest.fn(),
  leaveGroup: jest.fn(),
  getMessages: jest.fn(),
  postMessage: jest.fn(),
  approveRequest: jest.fn(),
  manageMemberRole: jest.fn(),
  kickMember: jest.fn(),
  rejectRequest: jest.fn(),
};

const mockUser = { id: 'user-1' };
const mockRequest = { user: mockUser } as unknown as Request;

describe('GroupController', () => {
  let controller: GroupController;
  let service: GroupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupController],
      providers: [{ provide: GroupService, useValue: mockGroupService }],
    }).compile();

    controller = module.get<GroupController>(GroupController);
    service = module.get<GroupService>(GroupService);
    jest.clearAllMocks();
  });

  it('create should call service.create', async () => {
    const dto = new CreateGroupDto();
    await controller.create(dto, mockRequest);
    expect(service.create).toHaveBeenCalledWith(dto, mockUser.id);
  });

  it('join should call service.joinGroup', async () => {
    const groupId = 'group-123';
    await controller.join(groupId, mockRequest);
    expect(service.joinGroup).toHaveBeenCalledWith(groupId, mockUser.id);
  });

  it('postMessage should call service.postMessage', async () => {
    const groupId = 'group-123';
    const dto = new CreateGroupMessageDto();
    await controller.postMessage(groupId, mockRequest, dto);
    expect(service.postMessage).toHaveBeenCalledWith(groupId, mockUser.id, dto);
  });

  it('kickMember should call service.kickMember', async () => {
    const groupId = 'group-123';
    const targetUserId = 'user-2';
    await controller.kickMember(groupId, targetUserId, mockRequest);
    expect(service.kickMember).toHaveBeenCalledWith(
      groupId,
      mockUser.id,
      targetUserId,
    );
  });
});
