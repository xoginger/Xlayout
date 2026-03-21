/**
 * seed-catalog.js — Plain JS seed for XLayout Catalog
 * Run inside xlayout_api container: node /app/prisma/seed-catalog.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PUBLIC_GLBS = {
  box: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Box.glb',
};

async function upsertTenant(slug, name) {
  const existing = await prisma.tenant.findFirst({ where: { slug } });
  if (existing) { console.log(`  ✓ Tenant: ${name}`); return existing; }
  const t = await prisma.tenant.create({ data: { name, slug, status: 'ACTIVE', contactEmail: `hola@${slug}.mx` } });
  console.log(`  + Tenant: ${name} (${t.id})`);
  return t;
}

async function upsertLine(tenantId, name) {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  const existing = await prisma.productLine.findFirst({ where: { tenantId, slug } });
  if (existing) { console.log(`    ✓ Line: ${name}`); return existing; }
  const l = await prisma.productLine.create({ data: { tenantId, name, slug, active: true } });
  console.log(`    + Line: ${name}`);
  return l;
}

async function upsertProduct(tenantId, lineId, def) {
  let product = await prisma.product.findFirst({ where: { tenantId, sku: def.sku } });
  if (!product) {
    product = await prisma.product.create({
      data: { tenantId, lineId, sku: def.sku, name: def.name, description: def.description,
        width: def.width, depth: def.depth, height: def.height, active: true, status: 'PUBLISHED' }
    });
    console.log(`      + Product: ${def.name}`);
  } else {
    await prisma.product.update({ where: { id: product.id }, data: { status: 'PUBLISHED', active: true } });
    console.log(`      ✓ Published: ${def.name}`);
  }

  // Price
  const existingPrice = await prisma.productPrice.findFirst({ where: { productId: product.id, active: true } });
  if (!existingPrice) {
    await prisma.productPrice.create({ data: { tenantId, productId: product.id, currency: def.currency, basePrice: def.price, active: true } });
    console.log(`        $ ${def.price} ${def.currency}`);
  }

  // 3D Asset
  const existingAsset = await prisma.productAsset.findFirst({ where: { productId: product.id, assetType: 'model_3d' } });
  if (!existingAsset) {
    await prisma.productAsset.create({
      data: { tenantId, productId: product.id, assetType: 'model_3d', model3dUrl: def.glbUrl,
        metadata: { floorAnchor: def.floorAnchor || 0, scaleFactor: 1.0, resizable: true } }
    });
    console.log(`        🎲 3D asset linked`);
  }

  return product;
}

async function main() {
  console.log('\n🌱 Seeding XLayout Catalog...\n');

  // ─── Demo Company ─────────────────────────────────────────────────────────
  console.log('📦 Demo Company');
  const demo = await upsertTenant('demo', 'Demo Company');
  const officeDemo = await upsertLine(demo.id, 'Office 2026');

  await upsertProduct(demo.id, officeDemo.id, { sku: 'DK-001', name: 'Escritorio Ejecutivo L', description: 'Escritorio en L para oficina ejecutiva, laminado nogal.', width: 1.8, depth: 1.2, height: 0.75, price: 14500, currency: 'MXN', glbUrl: PUBLIC_GLBS.box, floorAnchor: 0 });
  await upsertProduct(demo.id, officeDemo.id, { sku: 'CH-001', name: 'Silla Ergonómica Mesh', description: 'Silla de malla respirable con soporte lumbar.', width: 0.65, depth: 0.65, height: 1.15, price: 8900, currency: 'MXN', glbUrl: PUBLIC_GLBS.box, floorAnchor: 0 });
  await upsertProduct(demo.id, officeDemo.id, { sku: 'TBL-001', name: 'Mesa de Reuniones 8p', description: 'Mesa rectangular sala de juntas, tablero melamina blanca.', width: 2.4, depth: 1.2, height: 0.75, price: 22000, currency: 'MXN', glbUrl: PUBLIC_GLBS.box, floorAnchor: 0 });

  // ─── PM La Piedad ─────────────────────────────────────────────────────────
  console.log('\n📦 PM La Piedad');
  const pm = await upsertTenant('pm-la-piedad', 'PM La Piedad');

  const terra = await upsertLine(pm.id, 'Terra');
  await upsertProduct(pm.id, terra.id, { sku: 'TER-DK-001', name: 'Escritorio Terra Roble', description: 'Escritorio roble natural, line Terra.', width: 1.6, depth: 0.8, height: 0.75, price: 18900, currency: 'MXN', glbUrl: PUBLIC_GLBS.box, floorAnchor: 0 });

  const lockers = await upsertLine(pm.id, 'Lockers');
  await upsertProduct(pm.id, lockers.id, { sku: 'LOC-001', name: 'Locker 4 Compartimentos', description: 'Locker metálico 4 compartimentos con llave.', width: 0.9, depth: 0.45, height: 1.85, price: 6500, currency: 'MXN', glbUrl: PUBLIC_GLBS.box, floorAnchor: 0 });

  const archiveros = await upsertLine(pm.id, 'Archiveros');
  await upsertProduct(pm.id, archiveros.id, { sku: 'ARC-001', name: 'Archivero 4 Cajones', description: 'Archivero metálico vertical 4 cajones.', width: 0.47, depth: 0.62, height: 1.32, price: 5800, currency: 'MXN', glbUrl: PUBLIC_GLBS.box, floorAnchor: 0 });

  const racks = await upsertLine(pm.id, 'Racks');
  await upsertProduct(pm.id, racks.id, { sku: 'RCK-001', name: 'Rack Almacén 5 Niveles', description: 'Rack acero galvanizado 5 niveles, 500kg.', width: 1.8, depth: 0.6, height: 2.0, price: 4200, currency: 'MXN', glbUrl: PUBLIC_GLBS.box, floorAnchor: 0 });

  console.log('\n✅ Seed completado — 2 tenants, 5 líneas, 7 productos PUBLISHED\n');
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
