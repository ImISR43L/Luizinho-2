
import { Module } from '@nestjs/common';
import { HabitService } from './habit.service';
import { HabitController } from './habit.controller';
import { PrismaService } from '../prisma/prisma.service';
import { UserModule } from '../user/user.module'; 

@Module({
  imports: [UserModule], 
  controllers: [HabitController],
  providers: [HabitService, PrismaService],
})
export class HabitModule {}
