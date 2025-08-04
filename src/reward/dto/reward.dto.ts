import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateRewardDto {
  @ApiProperty({ example: 'Watch a movie' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false, example: 'Pick a movie from the watchlist.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0, { message: 'Cost must not be negative.' })
  cost: number;
}

export class UpdateRewardDto extends PartialType(CreateRewardDto) {}
