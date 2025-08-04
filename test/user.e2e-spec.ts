
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  const testUser = {
    email: 'e2e-user@test.com',
    username: 'e2e-user',
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

    await request(app.getHttpServer()).post('/auth/register').send(testUser);
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    accessToken = loginResponse.body.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('/users/profile (GET)', () => {
    it('should successfully get the user profile when authenticated', () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body.email).toEqual(testUser.email);
          expect(res.body).not.toHaveProperty('passwordHash');
        });
    });

    it('should return a 401 Unauthorized error if no token is provided', () => {
      return request(app.getHttpServer()).get('/users/profile').expect(401);
    });

    it('should return a 401 Unauthorized error if the token is invalid', () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer aninvalidtoken')
        .expect(401);
    });
  });
});
