import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePetDto } from './dto/pet.dto';
import { PetStat, ItemType, EquipmentSlot } from '@prisma/client';

@Injectable()
export class PetService {
  constructor(private readonly prisma: PrismaService) {}

  async getPetByUserId(userId: string) {
    const pet = await this.prisma.pet.findUnique({
      where: { userId },
      include: {
        equipped: {
          include: {
            item: true,
          },
        },
      },
    });
    if (!pet) {
      throw new NotFoundException('Pet not found for this user.');
    }
    return pet;
  }

  async updatePet(userId: string, updatePetDto: UpdatePetDto) {
    return this.prisma.pet.update({
      where: { userId },
      data: updatePetDto,
    });
  }

  async getUserInventory(userId: string) {
    return this.prisma.userPetItem.findMany({
      where: { userId },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getShopItems() {
    return this.prisma.petItem.findMany({ orderBy: { cost: 'asc' } });
  }

  async buyItem(userId: string, itemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      const itemToBuy = await tx.petItem.findUnique({ where: { id: itemId } });

      if (!user) throw new NotFoundException('User not found.');
      if (!itemToBuy)
        throw new NotFoundException(`Item with ID "${itemId}" not found.`);

      if (itemToBuy.isPremium) {
        if (user.gems < itemToBuy.cost) {
          throw new ConflictException(`Not enough gems.`);
        }
      } else {
        if (user.gold < itemToBuy.cost) {
          throw new ConflictException(`Not enough gold.`);
        }
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          gold: { decrement: itemToBuy.isPremium ? 0 : itemToBuy.cost },
          gems: { decrement: itemToBuy.isPremium ? itemToBuy.cost : 0 },
        },
      });

      const existingInventoryItem = await tx.userPetItem.findFirst({
        where: { userId, itemId },
      });

      if (existingInventoryItem) {
        return tx.userPetItem.update({
          where: { id: existingInventoryItem.id },
          data: { quantity: { increment: 1 } },
        });
      } else {
        return tx.userPetItem.create({
          data: { userId, itemId, quantity: 1 },
        });
      }
    });
  }

  async useItemOnPet(userId: string, userPetItemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const userInventoryItem = await tx.userPetItem.findUnique({
        where: { id: userPetItemId },
        include: { item: true },
      });

      if (!userInventoryItem || userInventoryItem.userId !== userId) {
        throw new NotFoundException(
          `Item with ID "${userPetItemId}" not found in your inventory.`,
        );
      }

      if (userInventoryItem.item.type === ItemType.CUSTOMIZATION) {
        throw new BadRequestException(
          'Wearable items must be equipped, not used.',
        );
      }

      const pet = await tx.pet.findUnique({ where: { userId } });
      if (!pet)
        throw new InternalServerErrorException('Could not find the user pet.');

      const { item } = userInventoryItem;

      if (item.statEffect && item.effectValue) {
        const statToUpdate: Partial<typeof pet> = {};

        switch (item.statEffect) {
          case PetStat.HAPPINESS:
            statToUpdate.happiness = Math.min(
              100,
              pet.happiness + item.effectValue,
            );
            break;
          case PetStat.HEALTH:
            statToUpdate.health = Math.min(100, pet.health + item.effectValue);
            break;
          case PetStat.HUNGER:
            statToUpdate.hunger = Math.min(100, pet.hunger + item.effectValue);
            break;
          case PetStat.ENERGY:
            statToUpdate.energy = Math.min(100, pet.energy + item.effectValue);
            break;
        }

        await tx.pet.update({
          where: { userId },
          data: statToUpdate,
        });
      }

      if (userInventoryItem.quantity > 1) {
        await tx.userPetItem.update({
          where: { id: userPetItemId },
          data: { quantity: { decrement: 1 } },
        });
      } else {
        await tx.userPetItem.delete({ where: { id: userPetItemId } });
      }

      const updatedPet = await tx.pet.findUnique({ where: { userId } });
      return {
        message: `You used ${item.name} on ${pet.name}!`,
        pet: updatedPet,
      };
    });
  }

  async equipItem(userId: string, userPetItemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const pet = await tx.pet.findUnique({ where: { userId } });
      if (!pet)
        throw new InternalServerErrorException('Pet not found for user.');

      const inventoryItem = await tx.userPetItem.findUnique({
        where: { id: userPetItemId },
        include: { item: true },
      });

      if (!inventoryItem || inventoryItem.userId !== userId) {
        throw new NotFoundException(
          `Item with ID "${userPetItemId}" not found in your inventory.`,
        );
      }

      const { item } = inventoryItem;
      if (item.type !== ItemType.CUSTOMIZATION || !item.equipmentSlot) {
        throw new BadRequestException('This item is not equippable.');
      }

      await tx.equippedItem.upsert({
        where: { petId_slot: { petId: pet.id, slot: item.equipmentSlot } },
        update: { petItemId: item.id },
        create: { petId: pet.id, petItemId: item.id, slot: item.equipmentSlot },
      });

      return tx.pet.findUnique({
        where: { userId },
        include: {
          equipped: {
            include: {
              item: true,
            },
          },
        },
      });
    });
  }

  async unequipItem(userId: string, slot: EquipmentSlot) {
    const pet = await this.prisma.pet.findUnique({ where: { userId } });
    if (!pet) throw new InternalServerErrorException('Pet not found for user.');

    const equippedItem = await this.prisma.equippedItem.findUnique({
      where: { petId_slot: { petId: pet.id, slot } },
    });

    if (!equippedItem) {
      throw new NotFoundException(`No item equipped in the ${slot} slot.`);
    }

    await this.prisma.equippedItem.delete({
      where: { petId_slot: { petId: pet.id, slot } },
    });

    return this.getPetByUserId(userId);
  }
}
