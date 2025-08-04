import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PetController (e2e)', () => {
  let app: INestApplication;
  let agent;
  let prisma: PrismaService;
  let accessToken: string;
  let testUserId: string;

  const testUser = {
    email: 'e2e-pet@test.com',
    username: 'e2e-pet-user',
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
    agent = request.agent(app.getHttpServer());

    const registerRes = await agent.post('/auth/register').send(testUser);
    testUserId = registerRes.body.id;
    const loginRes = await agent
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    accessToken = loginRes.body.accessToken;

    await prisma.user.update({
      where: { id: testUserId },
      data: { gold: 500 },
    });
  }, 30000); 

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  describe('Pet Item Lifecycle', () => {
    let appleItemId: string;
    let hatItemId: string;
    let userAppleId: string;

    it('/pet/shop (GET) - should fetch available items', async () => {
      const response = await agent
        .get('/pet/shop')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const apple = response.body.find((item) => item.name === 'Apple');
      const hat = response.body.find((item) => item.name === 'Top Hat');
      appleItemId = apple.id;
      hatItemId = hat.id;
    }, 10000);

    it('/pet/shop/buy/:itemId (POST) - should buy items', async () => {
      await agent
        .post(`/pet/shop/buy/${appleItemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      await agent
        .post(`/pet/shop/buy/${hatItemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    }, 10000);

    it('/pet/use (POST) - should use a consumable item and update pet stats', async () => {

      await prisma.pet.update({
        where: { userId: testUserId },
        data: { hunger: 80 },
      });
      const petBefore = await prisma.pet.findUnique({
        where: { userId: testUserId },
      });
      if (!petBefore) throw new Error('Pet not found');

      const inventoryRes = await agent
        .get('/pet/inventory')
        .set('Authorization', `Bearer ${accessToken}`);
      userAppleId = inventoryRes.body.find((i) => i.item.id === appleItemId).id;

      await agent
        .post('/pet/use')
        .send({ userPetItemId: userAppleId })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const petAfter = await prisma.pet.findUnique({
        where: { userId: testUserId },
      });
      if (!petAfter) throw new Error('Pet not found');

      expect(petAfter.hunger).toBeGreaterThan(petBefore.hunger);
      expect(petAfter.hunger).toBeLessThanOrEqual(100);
    }, 10000);

    it('/pet/equip (POST) - should equip an item', async () => {
      const inventoryRes = await agent
        .get('/pet/inventory')
        .set('Authorization', `Bearer ${accessToken}`);
      const hatInInventoryId = inventoryRes.body.find(
        (i) => i.item.id === hatItemId,
      ).id;

      await agent
        .post('/pet/equip')
        .send({ userPetItemId: hatInInventoryId })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const petRes = await agent
        .get('/pet')
        .set('Authorization', `Bearer ${accessToken}`);
      const equippedHat = petRes.body.equipped.find((e) => e.slot === 'HAT');
      expect(equippedHat.item.id).toEqual(hatItemId);
    }, 10000);

    it('/pet/unequip/:slot (DELETE) - should unequip an item', async () => {
      await agent
        .delete('/pet/unequip/HAT')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const petRes = await agent
        .get('/pet')
        .set('Authorization', `Bearer ${accessToken}`);
      const equippedHat = petRes.body.equipped.find((e) => e.slot === 'HAT');
      expect(equippedHat).toBeUndefined();
    }, 10000);
  });
});
