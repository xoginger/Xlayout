import { Module } from '@nestjs/common';
import { PlatformInfoController } from './platform-info.controller';

@Module({
  controllers: [PlatformInfoController],
})
export class PlatformInfoModule {}
