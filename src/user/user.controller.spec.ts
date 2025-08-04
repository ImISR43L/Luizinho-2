
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { Request } from 'express';

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return the user object from the request', () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        username: 'testuser',
      };

      const mockRequest = {
        user: mockUser,
      } as unknown as Request;

      const result = controller.getProfile(mockRequest);


      expect(result).toEqual(mockUser);
    });
  });
});
