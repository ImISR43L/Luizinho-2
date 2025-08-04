import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, username, password } = registerDto;

    const existingUser = await this.userService.findByEmailOrUsername(
      email,
      username,
    );
    if (existingUser) {
      throw new ConflictException(
        'An account with this email or username already exists.',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          username,
          passwordHash: hashedPassword,
        },
      });

      await tx.pet.create({
        data: {
          userId: newUser.id,
          name: `${newUser.username}'s Pet`,
        },
      });

      const defaultBackgrounds = await tx.petItem.findMany({
        where: {
          name: {
            in: [
              'Default Room',
              'Sunny Meadow',
              'Starry Night',
              'Cozy Library',
            ],
          },
        },
      });

      if (defaultBackgrounds.length > 0) {
        await tx.userPetItem.createMany({
          data: defaultBackgrounds.map((item) => ({
            userId: newUser.id,
            itemId: item.id,
          })),
        });
      }

      return newUser;
    });

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.userService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const payload = { username: user.username, sub: user.id };
    const accessToken = this.jwtService.sign(payload);

    const { passwordHash, ...result } = user;
    return {
      accessToken,
      user: result,
    };
  }

  async validateUser(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    const { passwordHash, ...result } = user;
    return result;
  }
}
