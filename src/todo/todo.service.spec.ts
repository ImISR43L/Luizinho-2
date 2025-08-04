import { Test, TestingModule } from '@nestjs/testing';
import { TodoService } from './todo.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Difficulty, Todo } from '@prisma/client';

const mockPrisma = {
  todo: { findUnique: jest.fn(), update: jest.fn() },
  user: { update: jest.fn() },
  pet: { update: jest.fn() },
  $transaction: jest
    .fn()
    .mockImplementation(async (callback) => await callback(mockPrisma)),
};

const mockTodo: Todo = {
  id: 'todo-1',
  userId: 'user-1',
  title: 'Test To-Do',
  notes: null,
  completed: false,
  difficulty: Difficulty.HARD,
  dueDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TodoService', () => {
  let service: TodoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<TodoService>(TodoService);
    jest.clearAllMocks();
  });

  describe('complete', () => {
    it('should complete a to-do, update user gold, and pet happiness', async () => {
      mockPrisma.todo.findUnique.mockResolvedValue(mockTodo);
      await service.complete('todo-1', 'user-1');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { gold: { increment: 16 } },
      });
      expect(mockPrisma.pet.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { happiness: { increment: 5 } },
      });
      expect(mockPrisma.todo.update).toHaveBeenCalledWith({
        where: { id: 'todo-1' },
        data: { completed: true },
      });
    });

    it('should throw ConflictException if the to-do is already completed', async () => {
      const completedTodo = { ...mockTodo, completed: true };
      mockPrisma.todo.findUnique.mockResolvedValue(completedTodo);
      await expect(service.complete('todo-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
