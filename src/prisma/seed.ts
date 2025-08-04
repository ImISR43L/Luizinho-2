// prisma/seed.ts
import {
  PrismaClient,
  PetStat,
  ItemType,
  HabitType,
  Difficulty,
  EquipmentSlot,
  UserGroupRole,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { subDays, startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting the seeding process...');

  // --- Seed Core Game Data ---
  console.log('🌱 Seeding Pet Items...');
  const items = await seedPetItems();

  console.log('🌱 Seeding Public Challenges...');
  const challenges = await seedChallenges();

  // --- Seed Users ---
  console.log('👤 Seeding user: Alice');
  const alice = await seedUser(
    'alice@example.com',
    'alice',
    'Password123!',
    {
      habits: [
        { title: 'Exercise for 30 minutes', difficulty: Difficulty.MEDIUM },
        { title: 'Read a book chapter', difficulty: Difficulty.EASY },
      ],
      dailies: [{ title: 'Morning Meditation', difficulty: Difficulty.EASY }],
      todos: [{ title: 'Buy groceries' }],
      rewards: [{ title: 'Watch a movie', cost: 50 }],
    },
    { habits: true, dailies: true },
  );

  console.log('👤 Seeding user: Bob');
  const bob = await seedUser('bob@example.com', 'bob', 'Password123!', {
    habits: [],
    dailies: [],
    todos: [],
    rewards: [],
  });

  const aliceHabitForLog = alice.habits.find(
    (h) => h.title === 'Exercise for 30 minutes',
  );
  const aliceDailyForLog = alice.dailies.find(
    (d) => d.title === 'Morning Meditation',
  );

  if (!aliceHabitForLog || !aliceDailyForLog) {
    throw new Error(
      "Could not find Alice's seeded habit or daily for logging.",
    );
  }

  // --- Seed User-Specific Data & Interactions ---
  console.log('📜 Seeding historical logs for Alice...');
  await seedLogs(alice.id, aliceHabitForLog.id, aliceDailyForLog.id);

  console.log('🎒 Seeding inventory for Alice...');
  const apple = items.find((i) => i.name === 'Apple');
  const topHat = items.find((i) => i.name === 'Top Hat');
  if (apple) await giveItemToUser(alice.id, apple.id, 3);
  if (topHat) await giveItemToUser(alice.id, topHat.id, 1);

  console.log("🎩 Equipping Top Hat on Alice's Pet...");
  if (topHat) {
    const alicePet = await prisma.pet.findUnique({
      where: { userId: alice.id },
    });
    if (alicePet)
      await equipItemOnPet(alicePet.id, topHat.id, EquipmentSlot.HAT);
  }

  console.log('🤝 Seeding Groups and Memberships...');
  const group = await seedGroup(
    'The Procrastinators',
    'A group for getting things done... eventually.',
    alice.id,
  );
  await joinGroup(group.id, bob.id);

  console.log('💬 Seeding Group Messages...');
  await seedGroupMessages(group.id, [
    { userId: alice.id, content: 'Hey everyone, welcome to the group!' },
    { userId: bob.id, content: 'Glad to be here!' },
  ]);

  console.log('🏆 Seeding Challenge Participations...');
  await joinChallenge(challenges[0].id, alice.id);
  await joinChallenge(challenges[1].id, bob.id);

  console.log('✅ Seeding finished successfully!');
}

// --- Seeder Functions ---

async function seedPetItems() {
  for (const item of petItemsData) {
    await prisma.petItem.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    });
  }
  return prisma.petItem.findMany();
}

// --- FIX: Reverted to the "findFirst then create" logic for challenges ---
async function seedChallenges() {
  for (const data of challengesData) {
    const existingChallenge = await prisma.challenge.findFirst({
      where: { title: data.title, creatorId: null }, // Specifically look for public challenges
    });
    if (!existingChallenge) {
      await prisma.challenge.create({ data });
    }
  }
  return prisma.challenge.findMany();
}

async function seedUser(
  email: string,
  username: string,
  password: string,
  data: {
    habits: Prisma.HabitCreateManyUserInput[];
    dailies: Prisma.DailyCreateManyUserInput[];
    todos: Prisma.TodoCreateManyUserInput[];
    rewards: Prisma.RewardCreateManyUserInput[];
  },
  include?: Prisma.UserInclude,
) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      username,
      passwordHash: hashedPassword,
      gold: 500,
      gems: 10,
      pet: { create: { name: `${username}'s Pet` } },
      habits: { create: data.habits },
      dailies: { create: data.dailies },
      todos: { create: data.todos },
      rewards: { create: data.rewards },
    },
    include,
  });
}

async function seedLogs(userId: string, habitId: string, dailyId: string) {
  const habitLogDates = [subDays(new Date(), 2), subDays(new Date(), 1)];
  for (const logDate of habitLogDates) {
    const existingLog = await prisma.habitLog.findFirst({
      where: {
        userId,
        habitId,
        date: { gte: startOfDay(logDate), lt: endOfDay(logDate) },
      },
    });

    if (!existingLog) {
      await prisma.habitLog.create({
        data: { userId, habitId, completed: true, date: logDate },
      });
    }
  }

  const dailyLogDate = subDays(new Date(), 1);
  const existingDailyLog = await prisma.dailyLog.findFirst({
    where: {
      userId,
      dailyId,
      date: { gte: startOfDay(dailyLogDate), lt: endOfDay(dailyLogDate) },
    },
  });

  if (!existingDailyLog) {
    await prisma.dailyLog.create({
      data: {
        userId,
        dailyId,
        date: dailyLogDate,
        notes: 'A good session.',
      },
    });
  }
}

async function giveItemToUser(userId: string, itemId: string, quantity = 1) {
  return prisma.userPetItem.upsert({
    where: { userId_itemId: { userId, itemId } },
    update: { quantity: { increment: quantity } },
    create: { userId, itemId, quantity },
  });
}

async function equipItemOnPet(
  petId: string,
  itemId: string,
  slot: EquipmentSlot,
) {
  return prisma.equippedItem.upsert({
    where: { petId_slot: { petId, slot } },
    update: { petItemId: itemId },
    create: { petId, petItemId: itemId, slot },
  });
}

async function seedGroup(name: string, description: string, ownerId: string) {
  const group = await prisma.group.upsert({
    where: { name },
    update: {},
    create: { name, description },
  });
  await prisma.userGroup.upsert({
    where: { userId_groupId: { userId: ownerId, groupId: group.id } },
    update: { role: UserGroupRole.OWNER },
    create: { userId: ownerId, groupId: group.id, role: UserGroupRole.OWNER },
  });
  return group;
}

async function joinGroup(groupId: string, userId: string) {
  return prisma.userGroup.upsert({
    where: { userId_groupId: { userId, groupId } },
    update: {},
    create: { userId, groupId, role: UserGroupRole.MEMBER },
  });
}

async function seedGroupMessages(
  groupId: string,
  messages: { userId: string; content: string }[],
) {
  for (const msgData of messages) {
    const existingMessage = await prisma.groupMessage.findFirst({
      where: {
        groupId: groupId,
        userId: msgData.userId,
        content: msgData.content,
      },
    });
    if (!existingMessage) {
      await prisma.groupMessage.create({
        data: { ...msgData, groupId },
      });
    }
  }
}

async function joinChallenge(challengeId: string, userId: string) {
  return prisma.userChallenge.upsert({
    where: { userId_challengeId: { userId, challengeId } },
    update: {},
    create: { userId, challengeId },
  });
}

const petItemsData = [
  {
    name: 'Apple',
    description: 'A crunchy, healthy fruit.',
    type: ItemType.FOOD,
    cost: 5,
    statEffect: PetStat.HUNGER,
    effectValue: 10,
    imageUrl: 'https://placehold.co/100x100/FF6347/FFFFFF.png?text=Apple',
  },
  {
    name: 'Steak',
    description: 'A hearty meal for a hungry pet.',
    type: ItemType.FOOD,
    cost: 15,
    statEffect: PetStat.HUNGER,
    effectValue: 30,
    imageUrl: 'https://placehold.co/100x100/8B4513/FFFFFF.png?text=Steak',
  },
  {
    name: 'Candy',
    description: 'A sugary treat that boosts happiness.',
    type: ItemType.TREAT,
    cost: 10,
    statEffect: PetStat.HAPPINESS,
    effectValue: 20,
    imageUrl: 'https://placehold.co/100x100/FFC0CB/000000.png?text=Candy',
  },
  {
    name: 'Top Hat',
    description: 'A very fancy top hat.',
    type: ItemType.CUSTOMIZATION,
    cost: 100,
    equipmentSlot: EquipmentSlot.HAT,
    imageUrl: 'https://placehold.co/100x100/363636/FFFFFF.png?text=Hat',
  },
  {
    name: 'Sunglasses',
    description: 'Cool shades for a cool pet.',
    type: ItemType.CUSTOMIZATION,
    cost: 75,
    equipmentSlot: EquipmentSlot.GLASSES,
    imageUrl: 'https://placehold.co/100x100/4169E1/FFFFFF.png?text=Glasses',
  },
  {
    name: 'Default Room',
    description: 'A simple, clean room for your pet.',
    type: ItemType.CUSTOMIZATION,
    cost: 0,
    equipmentSlot: EquipmentSlot.BACKGROUND,
    imageUrl: 'https://placehold.co/800x600/3a3a3a/3a3a3a.png',
  },
  {
    name: 'Sunny Meadow',
    description: 'A beautiful, sunny field for your pet to enjoy.',
    type: ItemType.CUSTOMIZATION,
    cost: 200,
    equipmentSlot: EquipmentSlot.BACKGROUND,
    imageUrl: 'https://placehold.co/800x600/87CEEB/90EE90.png',
  },
  {
    name: 'Starry Night',
    description: 'A peaceful night sky full of twinkling stars.',
    type: ItemType.CUSTOMIZATION,
    cost: 250,
    equipmentSlot: EquipmentSlot.BACKGROUND,
    imageUrl: 'https://placehold.co/800x600/00008B/FFD700.png',
  },
  {
    name: 'Cozy Library',
    description: 'A warm, quiet library with shelves of books.',
    type: ItemType.CUSTOMIZATION,
    cost: 300,
    equipmentSlot: EquipmentSlot.BACKGROUND,
    imageUrl: 'https://placehold.co/800x600/8B4513/D2B48C.png',
  },
];
const challengesData = [
  {
    title: '30-Day Fitness Challenge',
    description: 'Work out every day for 30 days.',
    goal: 'Log 30 fitness activities.',
  },
  {
    title: 'Mindful Mornings',
    description: 'Start your day with meditation.',
    goal: 'Meditate for 15 days this month.',
  },
];

main()
  .catch((e) => {
    console.error('An error occurred during seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
