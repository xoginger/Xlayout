/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Module } from '@nestjs/common';
import { PlatformInfoController, PlatformInfoVersionController } from './platform-info.controller';

@Module({
  // Ambos controladores: el público (versión) y el protegido (métricas, salud, config)
  controllers: [PlatformInfoVersionController, PlatformInfoController],
})
export class PlatformInfoModule {}

