
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { PetService } from './pet.service';
import {
  UpdatePetDto,
  UseItemDto,
  EquipItemDto,
  UnequipItemDto,
} from './dto/pet.dto';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { EquipmentSlot } from '@prisma/client';
import { IsEnum } from 'class-validator';

@ApiTags('Pet & Customization')
@ApiCookieAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('pet')
export class PetController {
  constructor(private readonly petService: PetService) {}

  @Get()
  @ApiOperation({ summary: "Get your pet's status and equipped items" })
  getMyPet(@Req() req: Request) {
    return this.petService.getPetByUserId(req.user['id']);
  }

  @Patch()
  @ApiOperation({ summary: "Update your pet's name" })
  updateMyPet(@Body() updatePetDto: UpdatePetDto, @Req() req: Request) {
    return this.petService.updatePet(req.user['id'], updatePetDto);
  }

  @Get('/inventory')
  @ApiOperation({ summary: 'Get your item inventory' })
  getMyInventory(@Req() req: Request) {
    return this.petService.getUserInventory(req.user['id']);
  }

  @Get('/shop')
  @ApiOperation({ summary: 'Get all items available in the shop' })
  getShopItems() {
    return this.petService.getShopItems();
  }

  @Post('/shop/buy/:itemId')
  @ApiOperation({ summary: 'Buy an item from the shop' })
  @ApiParam({ name: 'itemId', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.OK)
  buyItem(@Param('itemId', ParseUUIDPipe) itemId: string, @Req() req: Request) {
    return this.petService.buyItem(req.user['id'], itemId);
  }

  @Post('/use')
  @ApiOperation({
    summary: 'Use a consumable item (food, treat, toy) on your pet',
  })
  @ApiResponse({ status: 200, description: 'Item successfully used.' })
  @ApiResponse({ status: 400, description: 'Item is not a consumable.' })
  @HttpCode(HttpStatus.OK)
  useItem(@Body() useItemDto: UseItemDto, @Req() req: Request) {
    return this.petService.useItemOnPet(
      req.user['id'],
      useItemDto.userPetItemId,
    );
  }

  @Post('/equip')
  @ApiOperation({ summary: 'Equip an accessory from your inventory' })
  @ApiResponse({ status: 200, description: 'Item successfully equipped.' })
  @ApiResponse({ status: 400, description: 'Item is not equippable.' })
  @HttpCode(HttpStatus.OK)
  equipItem(@Body() equipItemDto: EquipItemDto, @Req() req: Request) {
    return this.petService.equipItem(
      req.user['id'],
      equipItemDto.userPetItemId,
    );
  }

  @Delete('/unequip/:slot')
  @ApiOperation({ summary: 'Unequip an item from a specific slot' })
  @ApiParam({
    name: 'slot',
    enum: EquipmentSlot,
    description: 'The slot to clear',
  })
  @ApiResponse({ status: 200, description: 'Item successfully unequipped.' })
  @ApiResponse({
    status: 404,
    description: 'No item found in the specified slot.',
  })
  @HttpCode(HttpStatus.OK)
  unequipItem(@Param() params: UnequipItemDto, @Req() req: Request) {
    return this.petService.unequipItem(req.user['id'], params.slot);
  }
}
