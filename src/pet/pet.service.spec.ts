import { Test, TestingModule } from '@nestjs/testing';
import { PetService } from './pet.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  ItemType,
  Pet,
  PetItem,
  UserPetItem,
  EquipmentSlot,
  PetStat,
  User,
} from '@prisma/client';


const mockUser: User = {
  id: 'user-1',
  email: 'a@a.com',
  username: 'a',
  passwordHash: 'h',
  gold: 500,
  gems: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockPet: Pet = {
  id: 'pet-1',
  userId: 'user-1',
  name: 'Sparky',
  hunger: 80,
  happiness: 80,
  health: 100,
  energy: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockFoodItem: PetItem = {
  id: 'item-food',
  name: 'Apple',
  description: '',
  type: ItemType.FOOD,
  cost: 10,
  statEffect: PetStat.HUNGER,
  effectValue: 15,
  isPremium: false,
  equipmentSlot: null,
  imageUrl: '',
};
const mockUserFoodItem: UserPetItem & { item: PetItem } = {
  id: 'user-pet-item-food',
  userId: 'user-1',
  itemId: 'item-food',
  quantity: 2,
  createdAt: new Date(),
  item: mockFoodItem,
};

const mockHatItem: PetItem = {
  id: 'item-hat',
  name: 'Top Hat',
  description: '',
  type: ItemType.CUSTOMIZATION,
  cost: 100,
  statEffect: null,
  effectValue: null,
  isPremium: false,
  equipmentSlot: EquipmentSlot.HAT,
  imageUrl: '',
};
const mockUserHatItem: UserPetItem & { item: PetItem } = {
  id: 'user-pet-item-hat',
  userId: 'user-1',
  itemId: 'item-hat',
  quantity: 1,
  createdAt: new Date(),
  item: mockHatItem,
};

const mockPrisma = {
  pet: { findUnique: jest.fn(), update: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
  petItem: { findUnique: jest.fn() },
  userPetItem: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  equippedItem: { upsert: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
  $transaction: jest
    .fn()
    .mockImplementation(async (callback) => await callback(mockPrisma)),
};

describe('PetService', () => {
  let service: PetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PetService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<PetService>(PetService);
    jest.clearAllMocks();
  });

  describe('buyItem', () => {
    it('should allow a user to buy an item they can afford', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.petItem.findUnique.mockResolvedValue(mockFoodItem);
      mockPrisma.userPetItem.findFirst.mockResolvedValue(null);

      await service.buyItem('user-1', 'item-food');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          gold: { decrement: mockFoodItem.cost },
          gems: { decrement: 0 },
        },
      });
      expect(mockPrisma.userPetItem.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if user has insufficient gold', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, gold: 5 });
      mockPrisma.petItem.findUnique.mockResolvedValue(mockFoodItem);

      await expect(service.buyItem('user-1', 'item-food')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('useItemOnPet', () => {
    it('should correctly apply stat changes and decrement quantity', async () => {
      mockPrisma.userPetItem.findUnique.mockResolvedValue(mockUserFoodItem);
      mockPrisma.pet.findUnique.mockResolvedValue(mockPet);

      await service.useItemOnPet('user-1', 'user-pet-item-food');

      expect(mockPrisma.pet.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: {
          hunger: Math.min(100, mockPet.hunger + mockFoodItem.effectValue),
        },
      });
      expect(mockPrisma.userPetItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { quantity: { decrement: 1 } },
        }),
      );
    });

    it('should delete the item if quantity reaches zero', async () => {
      const singleItem = { ...mockUserFoodItem, quantity: 1 };
      mockPrisma.userPetItem.findUnique.mockResolvedValue(singleItem);
      mockPrisma.pet.findUnique.mockResolvedValue(mockPet);

      await service.useItemOnPet('user-1', 'user-pet-item-food');

      expect(mockPrisma.userPetItem.delete).toHaveBeenCalledWith({
        where: { id: singleItem.id },
      });
    });
  });

  describe('equipItem', () => {
    it('should equip an item to the correct slot', async () => {
      mockPrisma.pet.findUnique.mockResolvedValue(mockPet);
      mockPrisma.userPetItem.findUnique.mockResolvedValue(mockUserHatItem);

      await service.equipItem('user-1', 'user-pet-item-hat');

      expect(mockPrisma.equippedItem.upsert).toHaveBeenCalledWith({
        where: { petId_slot: { petId: mockPet.id, slot: EquipmentSlot.HAT } },
        update: { petItemId: mockHatItem.id },
        create: {
          petId: mockPet.id,
          petItemId: mockHatItem.id,
          slot: EquipmentSlot.HAT,
        },
      });
    });

    it('should throw BadRequestException for non-equippable items', async () => {
      mockPrisma.pet.findUnique.mockResolvedValue(mockPet);
      mockPrisma.userPetItem.findUnique.mockResolvedValue(mockUserFoodItem);

      await expect(
        service.equipItem('user-1', 'user-pet-item-food'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('unequipItem', () => {
    it('should remove an item from an equipment slot', async () => {
      mockPrisma.pet.findUnique.mockResolvedValue(mockPet);
      mockPrisma.equippedItem.findUnique.mockResolvedValue({
        id: 'equipped-1',
        petId: mockPet.id,
        petItemId: mockHatItem.id,
        slot: EquipmentSlot.HAT,
      });

      await service.unequipItem('user-1', EquipmentSlot.HAT);

      expect(mockPrisma.equippedItem.delete).toHaveBeenCalledWith({
        where: { petId_slot: { petId: mockPet.id, slot: EquipmentSlot.HAT } },
      });
    });
  });
});
