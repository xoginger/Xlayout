/**
 * XLayout Master SaaS Backend — Seed
 * Version: master-backend-v1 | Build: 2026-03-16
 * -----------------------------------------------
 * Seeds:
 *   - Platform user: Xocotzin (platform_owner)
 *   - Tenant: PM La Piedad (pm-lapiedad)
 *   - Tenant: Demo Brand (demo-brand)
 *   - CompanyUser: admin@pmlapiedad.com (tenant_admin)
 *   - CompanyUser: admin@demobrand.com  (tenant_admin)
 *   - ActivationCode: example code for PM La Piedad
 *   - ProductLines: Terra, Lockers, Archiveros, Racks for PM La Piedad
 *   - ProductLines: Office, Storage for Demo Brand
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 XLayout SaaS Seed — master-backend-v1');

  // ── Platform Owner: Xocotzin ─────────────────────────────
  const xocotzin = await prisma.platformUser.upsert({
    where: { email: 'xocotzin@xlayout.io' },
    update: {},
    create: {
      email: 'xocotzin@xlayout.io',
      passwordHash: Buffer.from('admin2026!').toString('base64'), // Use bcrypt in production
      firstName: 'Xocotzin',
      lastName: 'Platform',
      role: 'PLATFORM_OWNER' as any,
      status: 'ACTIVE',
    },
  });
  console.log('✓ PlatformUser: Xocotzin →', xocotzin.id);

  // ── Tenant 1: PM La Piedad ───────────────────────────────
  const tenantPM = await prisma.tenant.upsert({
    where: { slug: 'pm-lapiedad' },
    update: {},
    create: {
      name: 'PM La Piedad',
      slug: 'pm-lapiedad',
      contactEmail: 'contacto@pmlapiedad.com',
      status: 'ACTIVE' as any,
      createdById: xocotzin.id,
      metadata: { country: 'MX', industry: 'furniture' },
    },
  });
  console.log('✓ Tenant: PM La Piedad →', tenantPM.id);

  // ── Tenant 2: Demo Brand ─────────────────────────────────
  const tenantDemo = await prisma.tenant.upsert({
    where: { slug: 'demo-brand' },
    update: {},
    create: {
      name: 'Demo Brand',
      slug: 'demo-brand',
      contactEmail: 'admin@demobrand.io',
      status: 'ACTIVE' as any,
      createdById: xocotzin.id,
      metadata: { country: 'MX', industry: 'demo' },
    },
  });
  console.log('✓ Tenant: Demo Brand →', tenantDemo.id);

  // ── Company Users ────────────────────────────────────────
  const adminPM = await prisma.companyUser.upsert({
    where: { email: 'admin@pmlapiedad.com' },
    update: {},
    create: {
      tenantId: tenantPM.id,
      email: 'admin@pmlapiedad.com',
      passwordHash: Buffer.from('pmadmin2026!').toString('base64'),
      firstName: 'Admin',
      lastName: 'PM La Piedad',
      role: 'TENANT_ADMIN' as any,
      status: 'ACTIVE',
    },
  });
  console.log('✓ CompanyUser: admin@pmlapiedad.com →', adminPM.id);

  const adminDemo = await prisma.companyUser.upsert({
    where: { email: 'admin@demobrand.io' },
    update: {},
    create: {
      tenantId: tenantDemo.id,
      email: 'admin@demobrand.io',
      passwordHash: Buffer.from('demoadmin2026!').toString('base64'),
      firstName: 'Admin',
      lastName: 'Demo Brand',
      role: 'TENANT_ADMIN' as any,
      status: 'ACTIVE',
    },
  });
  console.log('✓ CompanyUser: admin@demobrand.io →', adminDemo.id);

  // ── Product Lines — PM La Piedad ─────────────────────────
  const linesSeed = [
    { name: 'Terra', slug: 'terra', category: 'desk', description: 'Escritorios y mesas de trabajo' },
    { name: 'Lockers', slug: 'lockers', category: 'locker', description: 'Casilleros y armarios de seguridad' },
    { name: 'Archiveros', slug: 'archiveros', category: 'filing-cabinet', description: 'Archiveros metálicos' },
    { name: 'Racks', slug: 'racks', category: 'rack', description: 'Almacenamiento selectivo para bodega' },
  ];
  for (const l of linesSeed) {
    await prisma.productLine.upsert({
      where: { tenantId_slug: { tenantId: tenantPM.id, slug: l.slug } },
      update: {},
      create: { tenantId: tenantPM.id, ...l, active: true },
    });
  }
  console.log('✓ ProductLines: Terra, Lockers, Archiveros, Racks → PM La Piedad');

  // ── Product Lines — Demo Brand ────────────────────────────
  const demoLines = [
    { name: 'Office', slug: 'office', category: 'desk', description: 'Demo office furniture' },
    { name: 'Storage', slug: 'storage', category: 'storage', description: 'Demo storage solutions' },
  ];
  for (const l of demoLines) {
    await prisma.productLine.upsert({
      where: { tenantId_slug: { tenantId: tenantDemo.id, slug: l.slug } },
      update: {},
      create: { tenantId: tenantDemo.id, ...l, active: true },
    });
  }
  console.log('✓ ProductLines: Office, Storage → Demo Brand');

  // ── Activation Code — PM La Piedad ───────────────────────
  await prisma.activationCode.upsert({
    where: { code: 'PMLAPIEDAD-DEMO' },
    update: {},
    create: {
      tenantId: tenantPM.id,
      code: 'PMLAPIEDAD-DEMO',
      catalogEnabled: true,
      pricesEnabled: true,
      conditionsEnabled: false,
      maxUses: 100,
      active: true,
    },
  });
  console.log('✓ ActivationCode: PMLAPIEDAD-DEMO');

  // ── Audit Log — seed action ──────────────────────────────
  await prisma.auditLog.create({
    data: {
      actorType: 'PLATFORM_USER',
      actorId: xocotzin.id,
      action: 'SEED_COMPLETE',
      entityType: 'system',
      payload: { version: 'master-backend-v1', build: '2026-03-16' },
    },
  });

  console.log('\n✅ Seed completed — Module: Master SaaS Backend | Version: master-backend-v1');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
