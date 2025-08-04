import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('ChallengeController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let accessToken1: string;
  let accessToken2: string;
  let userId1: string;
  let userId2: string;

  const user1 = {
    email: 'e2e-challenge1@test.com',
    username: 'e2e-challenge-owner',
    password: 'password123',
  };
  const user2 = {
    email: 'e2e-challenge2@test.com',
    username: 'e2e-challenge-joiner',
    password: 'password123',
  };

  let createdChallengeId: string;
  let user2ParticipationId: string;

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

    const res1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send(user1);
    userId1 = res1.body.id;
    const login1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user1.email, password: user1.password });
    accessToken1 = login1.body.accessToken;

    const res2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send(user2);
    userId2 = res2.body.id;
    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user2.email, password: user2.password });
    accessToken2 = login2.body.accessToken;

    await prisma.user.update({ where: { id: userId1 }, data: { gold: 1000 } });
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [user1.email, user2.email] } },
    });
    await app.close();
  });

  describe('Private Challenge Lifecycle', () => {
    it('/challenges (POST) - User 1 (owner) creates a new private challenge', () => {
      return request(app.getHttpServer())
        .post('/challenges')
        .set('Authorization', `Bearer ${accessToken1}`)
        .send({
          title: 'E2E Private Challenge',
          description: 'Test private flow',
          goal: 'Complete test',
          isPrivate: true,
        })
        .expect(201)
        .then((res) => {
          createdChallengeId = res.body.id;
          expect(res.body.isPrivate).toBe(true);
        });
    });

    it('/challenges/:id/join (POST) - User 2 requests to join the private challenge', () => {
      return request(app.getHttpServer())
        .post(`/challenges/${createdChallengeId}/join`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(200);
    });

    it("/challenges/participation/:userChallengeId/approve (POST) - User 1 approves User 2's request", async () => {
      const participation = await prisma.userChallenge.findFirst({
        where: { challengeId: createdChallengeId, userId: userId2 },
      });

      if (!participation) {
        throw new Error(
          'Test setup failed: Could not find user participation record to approve.',
        );
      }
      user2ParticipationId = participation.id;

      return request(app.getHttpServer())
        .post(`/challenges/participation/${user2ParticipationId}/approve`)
        .set('Authorization', `Bearer ${accessToken1}`)
        .expect(200);
    });

    it('/challenges/:id/start (POST) - User 1 starts the challenge', () => {
      return request(app.getHttpServer())
        .post(`/challenges/${createdChallengeId}/start`)
        .set('Authorization', `Bearer ${accessToken1}`)
        .expect(200);
    });

    it('/challenges/participation/:userChallengeId/complete (POST) - User 2 completes the challenge', () => {
      return request(app.getHttpServer())
        .post(`/challenges/participation/${user2ParticipationId}/complete`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(200)
        .then((res) => {
          expect(res.body.completed).toBe(true);
        });
    });
  });
});
