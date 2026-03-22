/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { ConversionModule } from '../conversion/conversion.module';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const UPLOAD_DIR = path.join(process.env.UPLOAD_DIR || '/app/storage', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomUUID();
    cb(null, `${name}${ext}`);
  },
});

@Module({
  imports: [
    ConversionModule,
    MulterModule.register({ storage }),
  ],
  providers: [CatalogService],
  controllers: [CatalogController],
})
export class CatalogModule {}
