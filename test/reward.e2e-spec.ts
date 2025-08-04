import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('RewardController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let testUserId: string;
  let createdRewardId: string;

  const testUser = {
    email: 'e2e-reward@test.com',
    username: 'e2e-reward-user',
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

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);
    testUserId = res.body.id;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    accessToken = loginRes.body.accessToken;
  }, 30000);

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  describe('Reward Lifecycle', () => {
    it('/rewards (POST) - should create a new reward', () => {
      return request(app.getHttpServer())
        .post('/rewards')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'E2E Test Reward', cost: 75, notes: 'A test note' })
        .expect(201)
        .then((res) => {
          createdRewardId = res.body.id;
          expect(res.body.cost).toBe(75);
        });
    });

    it('/rewards/:id/redeem (POST) - should fail if user has insufficient gold', () => {
      return request(app.getHttpServer())
        .post(`/rewards/${createdRewardId}/redeem`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409); 
    });

    it('/rewards/:id/redeem (POST) - should succeed after user gains gold and should update lastRedeemed', async () => {
      await prisma.user.update({
        where: { id: testUserId },
        data: { gold: 100 },
      });

      const response = await request(app.getHttpServer())
        .post(`/rewards/${createdRewardId}/redeem`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toContain('Successfully redeemed');
      expect(response.body.newGoldBalance).toBe(25);

   
      const updatedReward = await prisma.reward.findUnique({
        where: { id: createdRewardId },
      });

      if (!updatedReward) {
        throw new Error('Test failed: updatedReward not found');
      }
      expect(updatedReward.lastRedeemed).not.toBeNull();

      if (updatedReward.lastRedeemed) {
        expect(new Date(updatedReward.lastRedeemed)).toBeInstanceOf(Date);
      }
    });
  });
});
