
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { HabitModule } from './habit/habit.module';
import { DailyModule } from './daily/daily.module';
import { ChallengeModule } from './challenge/challenge.module';
import { RewardModule } from './reward/reward.module';
import { TodoModule } from './todo/todo.module';
import { PetModule } from './pet/pet.module';
import { GroupModule } from './group/group.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    HabitModule,
    DailyModule,
    ChallengeModule,
    RewardModule,
    TodoModule,
    PetModule,
    GroupModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
