import { PrismaClient, CompanyType, ProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Roles
  const rolesData = ['ADMIN', 'DESIGNER', 'SALES', 'MANAGER', 'VIEWER'];
  const roles = await Promise.all(
    rolesData.map(name => prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} Role` }
    }))
  );

  // 2. Companies
  const c1 = await prisma.company.create({ data: { name: 'XLayout Platform', type: CompanyType.PLATFORM_OWNER } });
  const c2 = await prisma.company.create({ data: { name: 'Global Manufacturers', type: CompanyType.MANUFACTURER } });
  const c3 = await prisma.company.create({ data: { name: 'Distributor Alpha', type: CompanyType.DISTRIBUTOR } });

  // 3. Brands (associated with Manufacturer)
  const b1 = await prisma.brand.create({ data: { name: 'PM La Piedad', tenantId: c2.id } });
  const b2 = await prisma.brand.create({ data: { name: 'Offiho', tenantId: c2.id } });
  const b3 = await prisma.brand.create({ data: { name: 'Interstuhl', tenantId: c2.id } });

  // 4. Lines & Categories (10 lines total distributed)
  const cat = await prisma.productCategory.create({ data: { name: 'Chairs' } });
  const brands = [b1, b2, b3];
  const lines = [];
  
  for (let i = 0; i < 10; i++) {
    const brand = brands[i % 3];
    const line = await prisma.productLine.create({
       data: { name: `Line ${i + 1}`, brandId: brand.id }
    });
    lines.push({ line, brand });
  }

  // 5. Products (40 products)
  for (let i = 0; i < 40; i++) {
    const { line, brand } = lines[i % 10];
    await prisma.product.create({
      data: {
        sku: `SKU-${1000 + i}`,
        name: `${brand.name} Product ${i+1}`,
        brandId: brand.id,
        lineId: line.id,
        categoryId: cat.id,
        width: 60, depth: 60, height: 100,
        basePrice: 150 + (i * 10),
        status: ProductStatus.PUBLISHED
      }
    });
  }

  // 6. Price Lists & Discounts
  const pl1 = await prisma.priceList.create({ data: { name: 'Standard USD' } });
  const pl2 = await prisma.priceList.create({ data: { name: 'Retail USD' } });

  await prisma.companyPriceList.create({ data: { companyId: c3.id, priceListId: pl1.id } });

  const discountStrategies = [
    { name: '10% PM La Piedad', type: 'BrandDiscountStrategy', payload: { brandId: b1.id, discountPercent: 10 } },
    { name: '5% Offiho', type: 'BrandDiscountStrategy', payload: { brandId: b2.id, discountPercent: 5 } },
    { name: '15% Interstuhl', type: 'BrandDiscountStrategy', payload: { brandId: b3.id, discountPercent: 15 } },
    { name: 'Volume > 50', type: 'VolumeDiscountStrategy', payload: { minQty: 50, discountPercent: 12 } },
    { name: 'Volume > 100', type: 'VolumeDiscountStrategy', payload: { minQty: 100, discountPercent: 20 } },
    { name: 'Holiday Promo', type: 'PromotionalRuleStrategy', payload: { globalDiscountPercent: 5 } },
  ];

  for (const ds of discountStrategies) {
    await prisma.discountRule.create({
      data: {
        tenantId: c3.id,
        name: ds.name,
        strategyType: ds.type,
        configPayload: ds.payload,
        active: true
      }
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
