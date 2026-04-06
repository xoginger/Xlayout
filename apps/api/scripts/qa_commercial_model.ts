/**
 * Creado y diseñado por XO
 * Script de QA Automatizado: Modelo Comercial XLayout
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PricingEngineService } from '../src/pricing/pricing.service';
import { QuotesService } from '../src/quotes/quotes.service';
import { DistributorsService } from '../src/distributors/distributors.service';
import { ManufacturerDistributorService } from '../src/distributors/manufacturer-distributor.service';

async function runQA() {
  console.log('🔄 Inicializando QA del Modelo Comercial...\n');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

  const prisma = app.get(PrismaService);
  const pricingEngine = app.get(PricingEngineService);
  const quotesService = app.get(QuotesService);
  const distributorsService = app.get(DistributorsService);
  const mdService = app.get(ManufacturerDistributorService);

  try {
    // ─── 0. PREPARACIÓN DE DATOS REQUERIDOS ───────────────────────────────
    console.log('📦 Preparando datos de prueba en cascada...');

    // Limpiar tests previos
    await prisma.client.quote.deleteMany({ where: { isTestData: true } }).catch(() => null);
    await prisma.client.product.deleteMany({ where: { sku: { startsWith: 'QA-' } } }).catch(() => null);
    await prisma.client.distributorCompany.deleteMany({ where: { slug: { startsWith: 'qa-' } } }).catch(() => null);
    await prisma.client.tenant.deleteMany({ where: { slug: { startsWith: 'qa-' } } }).catch(() => null);

    // Crear Tenants (Marcas)
    const tenantA = await prisma.client.tenant.create({
      data: { name: 'QA Marca A', slug: 'qa-marca-a', status: 'ACTIVE' }
    });
    const tenantB = await prisma.client.tenant.create({
      data: { name: 'QA Marca B', slug: 'qa-marca-b', status: 'ACTIVE' }
    });

    // Crear Productos Test
    const pLineA = await prisma.client.productLine.create({
      data: { tenantId: tenantA.id, name: 'Línea QA A', active: true }
    });
    const pLineB = await prisma.client.productLine.create({
      data: { tenantId: tenantB.id, name: 'Línea QA B', active: true }
    });

    const productA = await prisma.client.product.create({
      data: { tenantId: tenantA.id, productLineId: pLineA.id, name: 'Silla QA A', sku: 'QA-SILLA-A', status: 'PUBLISHED', isTestData: true, 
              prices: { create: [{ priceType: 'A', basePrice: 1000, currency: 'MXN' }, { priceType: 'B', basePrice: 800, currency: 'MXN' }] } }
    });
    const productB = await prisma.client.product.create({
      data: { tenantId: tenantB.id, productLineId: pLineB.id, name: 'Mesa QA B', sku: 'QA-MESA-B', status: 'PUBLISHED', isTestData: true,
              prices: { create: [{ priceType: 'A', basePrice: 5000, currency: 'MXN' }] } }
    });

    // Crear Distribuidores
    const distStd = await distributorsService.createDistributor({ name: 'QA Distribuidor STANDARD', plan: 'STANDARD' });
    const distPro = await distributorsService.createDistributor({ name: 'QA Distribuidor PRO', plan: 'PRO' });

    // Autorizar e inyectar permisos de marca
    console.log('🔑 Configurando relaciones...');
    // distStd -> Marca A (Lista B, 10% descuento)
    await distributorsService.grantAccess(tenantA.id, distStd.id, ['A', 'B'], 'B');
    await mdService.assignDiscount(tenantA.id, distStd.id, { discountPercent: 10, scope: 'GLOBAL' });

    // distStd -> Marca B (Lista A, sin descuento)
    await distributorsService.grantAccess(tenantB.id, distStd.id, ['A'], 'A');

    // distPro -> Marca A (Lista B, 20% descuento)
    await distributorsService.grantAccess(tenantA.id, distPro.id, ['B'], 'B');
    await mdService.assignDiscount(tenantA.id, distPro.id, { discountPercent: 20, scope: 'GLOBAL' });
    // distPro -> Marca B (Lista A, 10% descuento)
    await distributorsService.grantAccess(tenantB.id, distPro.id, ['A'], 'A');
    await mdService.assignDiscount(tenantB.id, distPro.id, { discountPercent: 10, scope: 'GLOBAL' });

    const dummyProject = await prisma.client.projectVersion.create({
      data: { versionNum: 1, projectId: (await prisma.client.project.create({ data: { tenantId: tenantA.id, creatorId: 'qa-user', name: 'QA Project' } })).id }
    });

    // ─── DEFINIR EJECUCIÓN DE CASOS ───────────────────────────────────────
    let failed = 0;
    const assertTest = (cond: boolean, name: string) => {
      if (cond) {
         console.log(`  ✅ [PASS] ${name}`);
      } else {
         console.log(`  ❌ [FAIL] ${name}`);
         failed++;
      }
    };

    console.log('\n🚀 EJECUTANDO CASOS DE PRUEBA\n');

    // =====================================================================
    // CASO A: STANDARD una sola marca
    // Marca A (Base Lista B = $800, descuento 10% -> $720. Final: $720)
    console.log('Caso A: STANDARD, Lista correcta y descuento');
    let res = await pricingEngine.calculatePrice({
      tenantId: tenantA.id, distributorId: distStd.id, productId: productA.id, productLineId: pLineA.id, priceListType: 'B'
    });
    assertTest(res.baseListPrice === 800, `Base lista B correcta ($${res.baseListPrice})`);
    assertTest(res.discountPercent === 10, `Descuento marca aplicado (${res.discountPercent}%)`);
    assertTest(res.authorizedPrice === 720, `Precio autorizado correcto ($${res.authorizedPrice})`);
    assertTest(res.finalPrice === 720 && res.proMarkup === 0, `Precio final igual al autorizado sin markup ($${res.finalPrice})`);

    // =====================================================================
    // CASO B: STANDARD multi-marca
    console.log('\nCaso B: STANDARD Multi-marca (debe separar cotizaciones)');
    let quotesRes = await quotesService.generateQuote({
      userId: 'qa-user', userType: 'COMPANY_USER', projectVersionId: dummyProject.id,
      items: [
        { productId: productA.id, tenantId: tenantA.id, productLineId: pLineA.id, quantity: 1 },
        { productId: productB.id, tenantId: tenantB.id, productLineId: pLineB.id, quantity: 1 }
      ]
    });
    // Como userId es COMPANY_USER, QuotesService usa STANDARD behavior (o directamente STANDARD si forzamos simulando DISTRIBUTOR_USER).
    // Usaremos un hack mockeando el distribuidor para simular la vista del distribuidor.
    await prisma.client.$executeRawUnsafe(`UPDATE "Quote" SET "distributorId" = '${distStd.id}'`);
    
    // Llamada real pero simulando distribuidor en params:
    quotesRes = await quotesService['generatePerBrandQuotes'](dummyProject.id, distStd.id, [
       { productId: productA.id, tenantId: tenantA.id, productLineId: pLineA.id, quantity: 1 },
       { productId: productB.id, tenantId: tenantB.id, productLineId: pLineB.id, quantity: 1 }
    ], [tenantA.id, tenantB.id], 'qa-user');
    assertTest(quotesRes.mode === 'PER_BRAND', 'Modo de cotización es PER_BRAND');
    assertTest(quotesRes.quotes.length === 2, `Cotización separada exitosamente en ${quotesRes.quotes.length} marcas`);

    // =====================================================================
    // CASO C: PRO con fórmula válida
    console.log('\nCaso C: PRO con incremento válido');
    // Base Lista B = $800, descuento 20% -> $640. Markup PRO = 15% -> Final $736
    await distributorsService.setProPricingRule(distPro.id, { scope: 'GLOBAL', markupPercent: 15 });
    res = await pricingEngine.calculatePrice({
      tenantId: tenantA.id, distributorId: distPro.id, productId: productA.id, productLineId: pLineA.id, priceListType: 'B'
    });
    assertTest(res.authorizedPrice === 640, `Precio autorizado correcto ($${res.authorizedPrice})`);
    assertTest(res.proMarkup === 15, `Markup PRO aplicado (${res.proMarkup}%)`);
    assertTest(res.finalPrice === 736, `Precio final subido correctamente por markup ($${res.finalPrice})`);

    // =====================================================================
    // CASO D: PRO rompiendo piso mínimo
    console.log('\nCaso D: PRO intentando romper piso mínimo');
    // Desactivamos la regla anterior de 15% y le metemos una regla negativa (-10%)
    await prisma.client.distributorProPricingRule.updateMany({ where: { distributorId: distPro.id }, data: { active: false } });
    await prisma.client.distributorProPricingRule.create({ data: { distributorId: distPro.id, scope: 'GLOBAL', markupPercent: -10, active: true } });
    
    res = await pricingEngine.calculatePrice({
      tenantId: tenantA.id, distributorId: distPro.id, productId: productA.id, productLineId: pLineA.id, priceListType: 'B'
    });
    assertTest(res.authorizedPrice === 640, `Autorizado se mantiene en $640`);
    assertTest(res.proposedPrice === 576, `Propuesto por fórmula fue menor ($${res.proposedPrice})`);
    assertTest(res.finalPrice === 640, `Piso mínimo funcionó! (Final bloqueado en $${res.finalPrice})`);

    // =====================================================================
    // CASO E: Lista no permitida
    console.log('\nCaso E: Lista no permitida (Fallback a la que sí tiene o A)');
    // distStd tiene permitidas A y B. Intenta solicitar C.
    res = await pricingEngine.calculatePrice({
      tenantId: tenantA.id, distributorId: distStd.id, productId: productA.id, productLineId: pLineA.id, priceListType: 'C'
    });
    assertTest(res.priceListType === 'B', `Intentó C, sistema forzó fallback a lista por defecto B`);

    // =====================================================================
    // CASO F: Sin relación activa
    console.log('\nCaso F: Fabricante no autorizado (Relación inactiva o borrada)');
    // crear un distribuidor aislado
    const distAislado = await distributorsService.createDistributor({ name: 'QA Aislado', plan: 'STANDARD' });
    let authError = false;
    try {
      await pricingEngine.calculatePrice({
        tenantId: tenantA.id, distributorId: distAislado.id, productId: productA.id, productLineId: pLineA.id
      });
    } catch (e: any) {
      if (e.status === 403) authError = true;
    }
    assertTest(authError, 'Bloqueo exitoso (ForbiddenException arrojada)');

    // ─── FINALIZACIÓN ──────────────────────────────────────────────────
    console.log('\n================================');
    if (failed === 0) {
      console.log('✅ QA Completado Exitosamente (Cero fallos)');
    } else {
      console.log(`❌ QA Terminó con ${failed} fallos.`);
    }

  } catch (error) {
    console.error('Error no controlado durante la prueba:', error);
  } finally {
    // Limpieza agresiva de base de pruebas
    // En producción borrar datos QA en cascada:
    await prisma.client.quote.deleteMany({ where: { isTestData: true } }).catch(() => null);
    await prisma.client.product.deleteMany({ where: { sku: { startsWith: 'QA-' } } }).catch(() => null);
    await prisma.client.tenant.deleteMany({ where: { slug: { startsWith: 'qa-' } } }).catch(() => null);
    await prisma.client.distributorCompany.deleteMany({ where: { slug: { startsWith: 'qa-' } } }).catch(() => null);
    
    await app.close();
  }
}

runQA();
