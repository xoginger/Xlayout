// platform-users.module.ts — XLayout Platform User Module
import { Module } from '@nestjs/common';
import { PlatformUsersService } from './platform-users.service';
import { PlatformUsersController } from './platform-users.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformUsersController],
  providers: [PlatformUsersService],
  exports: [PlatformUsersService],
})
export class PlatformUsersModule {}
