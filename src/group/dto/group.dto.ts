import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { UserGroupRole } from '@prisma/client';

export class CreateGroupDto {
  @ApiProperty({ example: 'The Procrastinators' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    required: false,
    example: 'A group for getting things done... eventually.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class CreateGroupMessageDto {
  @ApiProperty({ example: 'Great job on the challenge everyone!' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ManageMemberDto {
  @ApiProperty({ description: 'The ID of the user to manage.' })
  @IsUUID()
  targetUserId: string;

  @ApiProperty({ enum: UserGroupRole, description: 'The new role to assign.' })
  @IsEnum(UserGroupRole)
  newRole: UserGroupRole;
}

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}
