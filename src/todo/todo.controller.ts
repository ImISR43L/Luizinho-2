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
import { TodoService } from './todo.service';
import { CreateTodoDto, UpdateTodoDto } from './dto/todo.dto';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Todos')
@ApiCookieAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('todos')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new to-do task' })
  create(@Body() createTodoDto: CreateTodoDto, @Req() req: Request) {
    return this.todoService.create(createTodoDto, req.user['id']);
  }

  @Get()
  @ApiOperation({ summary: 'Get all of your to-do tasks' })
  findAll(@Req() req: Request) {
    return this.todoService.findAllForUser(req.user['id']);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a to-do task' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTodoDto: UpdateTodoDto,
    @Req() req: Request,
  ) {
    return this.todoService.update(id, updateTodoDto, req.user['id']);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a to-do task' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.todoService.remove(id, req.user['id']);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark a to-do as complete' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  complete(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.todoService.complete(id, req.user['id']);
  }
}
