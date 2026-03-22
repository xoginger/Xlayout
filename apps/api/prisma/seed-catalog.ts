/**
 * seed-catalog.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Seeds two tenants (Demo + PM La Piedad) with product lines, products,
 * 3D assets (public GLB URLs from KhronosGroup/Three.js samples), and prices.
 * All products are set to status=PUBLISHED so they appear immediately in the editor.
 *
 * Run:
 *   docker exec xlayout_api npx ts-node prisma/seed-catalog.ts
 * or from inside the container:
 *   npx ts-node prisma/seed-catalog.ts
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Public GLB URLs — Khronos/Three.js samples (reliable, no auth required)
const PUBLIC_GLBS = {
  box:      '', // Nullified to trigger local procedural Box fallback
  chair:    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb',
  table:    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
  locker:   '',
  archiver: '',
  rack:     '',
};

async function upsertTenant(slug: string, name: string) {
  const existing = await prisma.tenant.findFirst({ where: { slug } });
  if (existing) {
    console.log(`  ✓ Tenant exists: ${name} (${existing.id})`);
    return existing;
  }
  const tenant = await prisma.tenant.create({
    data: { name, slug, status: 'ACTIVE', contactEmail: `hola@${slug}.mx` },
  });
  console.log(`  + Tenant created: ${name} (${tenant.id})`);
  return tenant;
}

async function upsertLine(tenantId: string, name: string) {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  const existing = await prisma.productLine.findUnique({ where: { tenantId_slug: { tenantId, slug } } });
  if (existing) {
    console.log(`    ✓ Line exists: ${name}`);
    return existing;
  }
  const line = await prisma.productLine.create({
    data: { tenantId, name, slug, active: true },
  });
  console.log(`    + Line created: ${name}`);
  return line;
}

interface ProductDef {
  sku: string;
  name: string;
  description: string;
  width: number;
  depth: number;
  height: number;
  price: number;
  currency: string;
  glbUrl: string;
  floorAnchor: number;
}

async function upsertProduct(tenantId: string, lineId: string, def: ProductDef) {
  const existing = await prisma.product.findUnique({ where: { tenantId_sku: { tenantId, sku: def.sku } } });

  let product = existing;
  if (!product) {
    product = await prisma.product.create({
      data: {
        tenantId,
        lineId,
        sku: def.sku,
        name: def.name,
        description: def.description,
        width: def.width,
        depth: def.depth,
        height: def.height,
        active: true,
        status: 'PUBLISHED',
      },
    });
    console.log(`      + Product: ${def.name} (${def.sku})`);
  } else {
    // Update status to PUBLISHED on existing
    product = await prisma.product.update({
      where: { id: existing!.id },
      data: { status: 'PUBLISHED', active: true },
    });
    console.log(`      ✓ Product updated to PUBLISHED: ${def.name}`);
  }

  // Price — upsert: delete existing active prices and create fresh
  const existingPrices = await prisma.productPrice.findMany({ where: { productId: product.id, active: true } });
  if (existingPrices.length === 0) {
    await prisma.productPrice.create({
      data: {
        tenantId,
        productId: product.id,
        currency: def.currency,
        basePrice: def.price,
        active: true,
      },
    });
    console.log(`        + Price: $${def.price} ${def.currency}`);
  }

  // 3D Asset — ensure one model_3d asset per product
  const existingAsset = await prisma.productAsset.findFirst({
    where: { productId: product.id, assetType: 'model_3d' },
  });
  if (!existingAsset) {
    await prisma.productAsset.create({
      data: {
        tenantId,
        productId: product.id,
        assetType: 'model_3d',
        model3dUrl: def.glbUrl,
        metadata: {
          floorAnchor: def.floorAnchor,
          scaleFactor: 1.0,
          resizable: true,
          forwardAxis: 'Z',
        },
      },
    });
    console.log(`        + Asset 3D: ${def.glbUrl.split('/').pop()}`);
  }

  return product;
}

async function main() {
  console.log('\n🌱 Seeding XLayout Catalog...\n');

  // ─── TENANT 1: Demo ────────────────────────────────────────────────────────
  console.log('📦 TENANT: Demo');
  const demo = await upsertTenant('demo', 'Demo Company');

  const officeLineDemo = await upsertLine(demo.id, 'Office 2026');

  const demoProducts: ProductDef[] = [
    {
      sku: 'DK-001',
      name: 'Escritorio Ejecutivo L',
      description: 'Escritorio en L para oficina ejecutiva, laminado en café nogal.',
      width: 1.8, depth: 1.2, height: 0.75,
      price: 14500, currency: 'MXN',
      glbUrl: PUBLIC_GLBS.box, floorAnchor: 0,
    },
    {
      sku: 'CH-001',
      name: 'Silla Ergonómica Mesh',
      description: 'Silla de malla respirable con soporte lumbar ajustable.',
      width: 0.65, depth: 0.65, height: 1.15,
      price: 8900, currency: 'MXN',
      glbUrl: PUBLIC_GLBS.box, floorAnchor: 0,
    },
    {
      sku: 'TBL-001',
      name: 'Mesa de Reuniones 8 Personas',
      description: 'Mesa rectangular para sala de juntas, tablero en melamina blanca.',
      width: 2.4, depth: 1.2, height: 0.75,
      price: 22000, currency: 'MXN',
      glbUrl: PUBLIC_GLBS.box, floorAnchor: 0,
    },
  ];

  for (const p of demoProducts) {
    await upsertProduct(demo.id, officeLineDemo.id, p);
  }

  // ─── TENANT 2: PM La Piedad ────────────────────────────────────────────────
  console.log('\n📦 TENANT: PM La Piedad');
  const pm = await upsertTenant('pm-la-piedad', 'PM La Piedad');

  // Lines
  const linesData = [
    { name: 'Terra', products: [
      {
        sku: 'TER-DK-001', name: 'Escritorio Terra Roble',
        description: 'Escritorio de madera sólida line Terra, acabado roble natural.',
        width: 1.6, depth: 0.8, height: 0.75,
        price: 18900, currency: 'MXN',
        glbUrl: PUBLIC_GLBS.box, floorAnchor: 0,
      },
    ]},
    { name: 'Lockers', products: [
      {
        sku: 'LOC-001', name: 'Locker 4 Compartimentos',
        description: 'Locker metálico con 4 compartimentos y llave.',
        width: 0.9, depth: 0.45, height: 1.85,
        price: 6500, currency: 'MXN',
        glbUrl: PUBLIC_GLBS.locker, floorAnchor: 0,
      },
    ]},
    { name: 'Archiveros', products: [
      {
        sku: 'ARC-001', name: 'Archivero 4 Cajones',
        description: 'Archivero vertical metálico con 4 cajones y cerradura.',
        width: 0.47, depth: 0.62, height: 1.32,
        price: 5800, currency: 'MXN',
        glbUrl: PUBLIC_GLBS.archiver, floorAnchor: 0,
      },
    ]},
    { name: 'Racks', products: [
      {
        sku: 'RCK-001', name: 'Rack de Almacenamiento 5 Niveles',
        description: 'Rack de acero galvanizado 5 niveles con capacidad 500kg total.',
        width: 1.8, depth: 0.6, height: 2.0,
        price: 4200, currency: 'MXN',
        glbUrl: PUBLIC_GLBS.rack, floorAnchor: 0,
      },
    ]},
  ];

  for (const lineData of linesData) {
    const line = await upsertLine(pm.id, lineData.name);
    for (const p of lineData.products as ProductDef[]) {
      await upsertProduct(pm.id, line.id, p);
    }
  }

  console.log('\n✅ Seed completado!');
  console.log('   Tenants:', 2);
  console.log('   Líneas:', 5);
  console.log('   Productos:', demoProducts.length + linesData.reduce((n, l) => n + l.products.length, 0));
  console.log('\nTodos los productos están en status=PUBLISHED y visibles en el editor.\n');
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
