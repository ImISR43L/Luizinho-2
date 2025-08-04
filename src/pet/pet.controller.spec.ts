import { Test, TestingModule } from '@nestjs/testing';
import { PetController } from './pet.controller';
import { PetService } from './pet.service';
import { Request } from 'express';
import {
  EquipItemDto,
  UnequipItemDto,
  UpdatePetDto,
  UseItemDto,
} from './dto/pet.dto';
import { EquipmentSlot } from '@prisma/client';

const mockPetService = {
  getPetByUserId: jest.fn(),
  updatePet: jest.fn(),
  getUserInventory: jest.fn(),
  getShopItems: jest.fn(),
  buyItem: jest.fn(),
  useItemOnPet: jest.fn(),
  equipItem: jest.fn(),
  unequipItem: jest.fn(),
};

const mockUser = { id: 'user-1' };
const mockRequest = { user: mockUser } as unknown as Request;

describe('PetController', () => {
  let controller: PetController;
  let service: PetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PetController],
      providers: [{ provide: PetService, useValue: mockPetService }],
    }).compile();

    controller = module.get<PetController>(PetController);
    service = module.get<PetService>(PetService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMyPet should call getPetByUserId with the correct user id', async () => {
    await controller.getMyPet(mockRequest);
    expect(service.getPetByUserId).toHaveBeenCalledWith(mockUser.id);
  });

  it('updateMyPet should call updatePet with correct user id and dto', async () => {
    const updateDto: UpdatePetDto = { name: 'NewName' };
    await controller.updateMyPet(updateDto, mockRequest);
    expect(service.updatePet).toHaveBeenCalledWith(mockUser.id, updateDto);
  });

  it('buyItem should call buyItem with correct user id and item id', async () => {
    const itemId = 'item-123';
    await controller.buyItem(itemId, mockRequest);
    expect(service.buyItem).toHaveBeenCalledWith(mockUser.id, itemId);
  });

  it('useItem should call useItemOnPet with correct user id and dto', async () => {
    const useDto: UseItemDto = { userPetItemId: 'user-item-123' };
    await controller.useItem(useDto, mockRequest);
    expect(service.useItemOnPet).toHaveBeenCalledWith(
      mockUser.id,
      useDto.userPetItemId,
    );
  });

  it('equipItem should call equipItem with correct params', async () => {
    const equipDto: EquipItemDto = { userPetItemId: 'user-pet-item-123' };
    await controller.equipItem(equipDto, mockRequest);
    expect(service.equipItem).toHaveBeenCalledWith(
      mockUser.id,
      equipDto.userPetItemId,
    );
  });

  it('unequipItem should call unequipItem with correct slot and user id', async () => {
    const slot = EquipmentSlot.HAT;
    const unequipDto: UnequipItemDto = { slot };
    await controller.unequipItem(unequipDto, mockRequest);
    expect(service.unequipItem).toHaveBeenCalledWith(mockUser.id, slot);
  });
});
