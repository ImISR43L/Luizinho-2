import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'test@example.com',
    description: "User's email address",
  })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email should not be empty.' })
  email: string;

  @ApiProperty({ example: 'testuser', description: "User's unique username" })
  @IsString()
  @IsNotEmpty({ message: 'Username should not be empty.' })
  @MinLength(3, { message: 'Username must be at least 3 characters long.' })
  username: string;

  @ApiProperty({
    example: 'password123',
    description: "User's password (min 8 characters)",
  })
  @IsString()
  @IsNotEmpty({ message: 'Password should not be empty.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email should not be empty.' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty({ message: 'Password should not be empty.' })
  password: string;
}
