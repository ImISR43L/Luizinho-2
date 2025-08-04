import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('GroupController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let accessToken1: string;
  let accessToken2: string;
  let userId1: string;

  const user1 = {
    email: 'e2e-group1@test.com',
    username: 'e2e-group1',
    password: 'password123',
  };
  const user2 = {
    email: 'e2e-group2@test.com',
    username: 'e2e-group2',
    password: 'password123',
  };

  let createdGroupId: string;

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

 
    await request(app.getHttpServer()).post('/auth/register').send(user2);
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

  describe('Group Creation and Social Flow', () => {
    it('/groups (POST) - User 1 creates a new public group', () => {
      return request(app.getHttpServer())
        .post('/groups')
        .set('Authorization', `Bearer ${accessToken1}`)
        .send({ name: 'E2E Test Crew', description: 'A group for testing' })
        .expect(201)
        .then((res) => {
          createdGroupId = res.body.id;
          expect(res.body.name).toEqual('E2E Test Crew');
        });
    });

    it('/groups/:id/join (POST) - User 2 joins the public group', () => {
      return request(app.getHttpServer())
        .post(`/groups/${createdGroupId}/join`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(201);
    });

    it('/groups/:id/messages (POST) - User 2 posts a message in the group', () => {
      return request(app.getHttpServer())
        .post(`/groups/${createdGroupId}/messages`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .send({ content: 'Hello from User 2!' })
        .expect(201)
        .then((res) => {
          expect(res.body.content).toEqual('Hello from User 2!');
        });
    });

    it('/groups/:id/leave (DELETE) - User 2 leaves the group', () => {
      return request(app.getHttpServer())
        .delete(`/groups/${createdGroupId}/leave`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(200);
    });

    it('/groups/:id (DELETE) - User 1 (owner) deletes the group', () => {
      return request(app.getHttpServer())
        .delete(`/groups/${createdGroupId}`)
        .set('Authorization', `Bearer ${accessToken1}`)
        .expect(200);
    });
  });
});
