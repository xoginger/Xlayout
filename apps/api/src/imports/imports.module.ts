/**
 * Creado y diseñado por XO
 * XLayout System — Módulo de Importaciones
 *
 * Configura BullMQ queue, Multer storage para archivos CSV/Excel,
 * y registra controller, service y processor.
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { ImportsProcessor } from './imports.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { DistributorsModule } from '../distributors/distributors.module';
import { AuditModule } from '../audit/audit.module';

// Directorio de almacenamiento para archivos de importación
const IMPORT_DIR = path.join(process.env.UPLOAD_DIR || '/app/storage', 'imports');
fs.mkdirSync(IMPORT_DIR, { recursive: true });

// Configuración de almacenamiento para archivos CSV/Excel
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, IMPORT_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomUUID();
    cb(null, `${name}${ext}`);
  },
});

@Module({
  imports: [
    PrismaModule,
    DistributorsModule,
    AuditModule,
    BullModule.registerQueue({ name: 'imports' }),
    MulterModule.register({ storage }),
  ],
  controllers: [ImportsController],
  providers: [ImportsService, ImportsProcessor],
})
export class ImportsModule {}
