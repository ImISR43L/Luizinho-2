import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  const testUser = {
    email: 'e2e-auth@test.com',
    username: 'e2e-auth-user',
    password: 'password123',
  };
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    await request(app.getHttpServer()).post('/auth/register').send(testUser);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('User Authentication Flow', () => {
    it('/auth/login (POST) - should successfully log in and return an access token', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200)
        .then((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body.user.email).toEqual(testUser.email);
          accessToken = res.body.accessToken;
        });
    });

    it('/users/profile (GET) - should successfully access a protected route using the access token', () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body.email).toEqual(testUser.email);
        });
    });

    it('/users/profile (GET) - should fail to access protected route without a token', () => {
      return request(app.getHttpServer()).get('/users/profile').expect(401);
    });

    it('/users/profile (GET) - should fail to access protected route with an invalid token', () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });
  });
});
