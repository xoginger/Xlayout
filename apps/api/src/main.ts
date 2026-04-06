/**
 * Creado y diseñado por XO
 * XLayout System — Entry Point
 * ─────────────────────────────────────────────────────────────────────────────
 * Bootstrap del servidor NestJS con seguridad, CORS y validación.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── PROXY TRUST ────────────────────────────────────────────────────────────
  // Permite que Express lea la IP real del cliente enviada por Nginx (X-Forwarded-For)
  // Crucial para que el Rate Limiting (Throttler) diferencie IPs reales y no banée globalmente.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // ─── SEGURIDAD: Headers HTTP ────────────────────────────────────────────────
  // Protege contra clickjacking, sniffing, XSS y otros ataques comunes
  app.use(helmet({
    // Desactivar CSP por ahora — Next.js maneja su propio CSP
    contentSecurityPolicy: false,
    // Permitir que el frontend cargue iframes si es necesario
    frameguard: { action: 'sameorigin' },
  }));

  // ─── SEGURIDAD: Límite de body parser ───────────────────────────────────────
  // Evita ataques de payload grande (DoS) — máximo 5MB para JSON, 10MB para form data
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // ─── SEGURIDAD: Validación global de payloads ──────────────────────────────
  // Rechaza propiedades no declaradas en DTOs (whitelist) y transforma tipos
  app.useGlobalPipes(
    new ValidationPipe({
      // Elimina propiedades no declaradas en el DTO
      whitelist: true,
      // Transforma payload a la instancia del DTO (habilita transformación de tipos)
      transform: true,
      // No lanzar error por propiedades extra (gradual — activar después de crear DTOs)
      forbidNonWhitelisted: false,
      // Desactivar validación implícita hasta que se creen los DTOs
      // Esto permite que endpoints sin DTO sigan funcionando
      disableErrorMessages: false,
    }),
  );

  // ─── CORS Dinámico ──────────────────────────────────────────────────────────
  // Whitelist de orígenes permitidos desde variable de entorno, con fallback
  // para desarrollo local.
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
  const allowedOrigins = [
    // Producción (dominios)
    ...allowedOriginsEnv.split(',').filter(Boolean),
    // Desarrollo local
    'http://localhost:3000',
    'http://localhost:3001',
    // Legacy (IP directa durante transición)
    'http://217.77.3.204',
    'http://217.77.3.204:3001',
  ];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Permitir requests sin origin (curl, server-to-server, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Permitir subdominios de xlayout
      if (/^https?:\/\/([a-z0-9-]+\.)?xlayout\.(mx|studio|io)$/.test(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    credentials: true,
  });

  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
