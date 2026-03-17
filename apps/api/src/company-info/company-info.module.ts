import { Module } from '@nestjs/common';
import { CompanyInfoController } from './company-info.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyInfoController],
})
export class CompanyInfoModule {}
