import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoDto, UpdateTodoDto } from './dto/todo.dto';
import { Difficulty } from '@prisma/client';

@Injectable()
export class TodoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTodoDto: CreateTodoDto, userId: string) {
    return this.prisma.todo.create({
      data: {
        ...createTodoDto,
        userId: userId,
      },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.todo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findOne(id: string, userId: string) {
    const todo = await this.prisma.todo.findUnique({ where: { id } });
    if (!todo) {
      throw new NotFoundException(`To-do with ID "${id}" not found.`);
    }
    if (todo.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this to-do.',
      );
    }
    return todo;
  }

  async update(id: string, updateTodoDto: UpdateTodoDto, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.todo.update({
      where: { id },
      data: updateTodoDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.todo.delete({ where: { id } });
  }

  async complete(todoId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const todo = await this.findOne(todoId, userId);

      if (todo.completed) {
        throw new ConflictException('This to-do has already been completed.');
      }

      const difficultyPoints = {
        [Difficulty.TRIVIAL]: 1,
        [Difficulty.EASY]: 4,
        [Difficulty.MEDIUM]: 8,
        [Difficulty.HARD]: 16,
      };
      const goldChange = difficultyPoints[todo.difficulty];
      const happinessChange = 5;

      await tx.user.update({
        where: { id: userId },
        data: { gold: { increment: goldChange } },
      });

      await tx.pet.update({
        where: { userId },
        data: { happiness: { increment: happinessChange } },
      });

      const updatedTodo = await tx.todo.update({
        where: { id: todoId },
        data: { completed: true },
      });

      return {
        message: 'To-do completed!',
        todo: updatedTodo,
        goldChange,
      };
    });
  }
}
