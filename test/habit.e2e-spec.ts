import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Difficulty, HabitType } from '@prisma/client';

describe('HabitController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let testUserId: string; 

  const testUser = {
    email: 'e2e-habit@test.com',
    username: 'e2e-habit-user',
    password: 'password123',
  };

  let createdHabitId: string;

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


    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);
    testUserId = registerResponse.body.id; 


    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    accessToken = loginResponse.body.accessToken;

    await prisma.user.update({
      where: { id: testUserId },
      data: { gold: 1000 },
    });
  }, 30000);

  afterAll(async () => {

    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } });
    }
    await app.close();
  });

  describe('Habit Lifecycle and Logic', () => {
    it('/habits (POST) - should create a new habit', async () => {
      const response = await request(app.getHttpServer())
        .post('/habits')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'E2E Test Habit',
          difficulty: Difficulty.EASY,
          type: HabitType.POSITIVE,
        })
        .expect(201);

      expect(response.body.title).toEqual('E2E Test Habit');
      createdHabitId = response.body.id;
    });

    it('/habits/:id/log (POST) - should log a positive completion and start a streak of 1', async () => {
      const response = await request(app.getHttpServer())
        .post(`/habits/${createdHabitId}/log`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ completed: true })
        .expect(200);

      expect(response.body.habit.currentStreak).toBe(1);
    });

    it('/habits/:id/pay-to-delete (DELETE) - should successfully delete the habit by paying the cost', async () => {
      const userBefore = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      if (!userBefore) {
        throw new Error('Test setup failed: userBefore not found');
      }
      const cost = 50; 

      await request(app.getHttpServer())
        .delete(`/habits/${createdHabitId}/pay-to-delete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const userAfter = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      if (!userAfter) {
        throw new Error('Test failed: userAfter not found');
      }
      expect(userAfter.gold).toBe(userBefore.gold - cost);
    });
  });
});
