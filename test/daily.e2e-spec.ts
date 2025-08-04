import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('DailyController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let createdDailyId: string;
  let testUserId: string;

  const testUser = {
    email: 'e2e-daily@test.com',
    username: 'e2e-daily-user',
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

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);
    testUserId = registerRes.body.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    accessToken = loginResponse.body.accessToken;
  }, 30000);

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  describe('Daily Lifecycle', () => {
    it('/dailies (POST) - should create a new daily', () => {
      return request(app.getHttpServer())
        .post('/dailies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'E2E Daily Test' })
        .expect(201)
        .then((res) => {
          expect(res.body.title).toEqual('E2E Daily Test');
          createdDailyId = res.body.id;
        });
    });

    it('/dailies/:id/complete (POST) - should complete the daily successfully', () => {
      return request(app.getHttpServer())
        .post(`/dailies/${createdDailyId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ notes: 'Completed for E2E test' })
        .expect(200);
    });

    it('/dailies/:id/complete (POST) - should fail to complete the same daily twice in one day', () => {
      return request(app.getHttpServer())
        .post(`/dailies/${createdDailyId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(409); 
    });

    it('/dailies (GET) - should retrieve the list of dailies', async () => {
      const response = await request(app.getHttpServer())
        .get('/dailies')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const myDaily = response.body.find((d) => d.id === createdDailyId);
      expect(myDaily).toBeDefined();

      expect(myDaily.completed).toBe(true);
    });
  });
});
