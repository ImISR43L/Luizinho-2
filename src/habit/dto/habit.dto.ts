import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { HabitType, Difficulty } from '@prisma/client';

export class CreateHabitDto {
  @ApiProperty({ example: 'Exercise for 30 minutes' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false, example: 'Go to the gym or run outside.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ enum: HabitType, default: HabitType.POSITIVE })
  @IsEnum(HabitType)
  @IsOptional()
  type?: HabitType;

  @ApiProperty({ enum: Difficulty, default: Difficulty.MEDIUM })
  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;
}

export class UpdateHabitDto extends PartialType(CreateHabitDto) {
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isPaused?: boolean;
}

export class LogHabitDto {
  @ApiProperty({
    description: 'True for a positive check-in, false for a negative one',
  })
  @IsBoolean()
  completed: boolean;

  @ApiProperty({ required: false, example: 'Felt tired today.' })
  @IsString()
  @IsOptional()
  notes?: string;
}
