import { Test, TestingModule } from '@nestjs/testing';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';
import { Request } from 'express';
import { CreateTodoDto, UpdateTodoDto } from './dto/todo.dto';

const mockTodoService = {
  create: jest.fn(),
  findAllForUser: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  complete: jest.fn(),
};

const mockUser = { id: 'user-1' };
const mockRequest = { user: mockUser } as unknown as Request;

describe('TodoController', () => {
  let controller: TodoController;
  let service: TodoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TodoController],
      providers: [{ provide: TodoService, useValue: mockTodoService }],
    }).compile();

    controller = module.get<TodoController>(TodoController);
    service = module.get<TodoService>(TodoService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should call service.create with correct dto and user id', async () => {
    const dto = new CreateTodoDto();
    await controller.create(dto, mockRequest);
    expect(service.create).toHaveBeenCalledWith(dto, mockUser.id);
  });

  it('findAll should call service.findAllForUser with correct user id', async () => {
    await controller.findAll(mockRequest);
    expect(service.findAllForUser).toHaveBeenCalledWith(mockUser.id);
  });

  it('update should call service.update with correct id, dto, and user id', async () => {
    const todoId = 'todo-123';
    const dto = new UpdateTodoDto();
    await controller.update(todoId, dto, mockRequest);
    expect(service.update).toHaveBeenCalledWith(todoId, dto, mockUser.id);
  });

  it('remove should call service.remove with correct id and user id', async () => {
    const todoId = 'todo-123';
    await controller.remove(todoId, mockRequest);
    expect(service.remove).toHaveBeenCalledWith(todoId, mockUser.id);
  });

  it('complete should call service.complete with correct id and user id', async () => {
    const todoId = 'todo-123';
    await controller.complete(todoId, mockRequest);
    expect(service.complete).toHaveBeenCalledWith(todoId, mockUser.id);
  });
});
