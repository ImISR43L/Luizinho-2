import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('TodoController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let testUserId: string;
  let createdTodoId: string;

  const testUser = {
    email: 'e2e-todo@test.com',
    username: 'e2e-todo-user',
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);
    testUserId = registerRes.body.id;
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    accessToken = loginRes.body.accessToken;
  }, 30000);

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  describe('To-Do Lifecycle', () => {
    it('/todos (POST) - should create a new to-do task', () => {
      return request(app.getHttpServer())
        .post('/todos')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Finish E2E tests for To-Do' })
        .expect(201)
        .then((res) => {
          expect(res.body.title).toEqual('Finish E2E tests for To-Do');
          createdTodoId = res.body.id;
        });
    });

    it('/todos/:id/complete (POST) - should complete the to-do', () => {
      return request(app.getHttpServer())
        .post(`/todos/${createdTodoId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('/todos/:id (DELETE) - should delete the completed to-do', () => {
      return request(app.getHttpServer())
        .delete(`/todos/${createdTodoId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });
  });
});
