import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Difficulty } from '@prisma/client';

export class CreateDailyDto {
  @ApiProperty({ example: 'Morning Meditation' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false, example: 'Use a guided meditation app.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ enum: Difficulty, default: Difficulty.EASY })
  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;
}

export class UpdateDailyDto extends PartialType(CreateDailyDto) {}


export class CompleteDailyDto {
  @ApiProperty({
    required: false,
    description: "Optional notes for today's completion.",
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
