// company-users.module.ts — XLayout Company Users Module
import { Module } from '@nestjs/common';
import { CompanyUsersService } from './company-users.service';
import { CompanyUsersController } from './company-users.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyUsersController],
  providers: [CompanyUsersService],
  exports: [CompanyUsersService],
})
export class CompanyUsersModule {}
