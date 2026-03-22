/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing corrupted Box.glb URLs in DB...');
  const result = await prisma.productAsset.updateMany({
    where: {
      model3dUrl: {
        contains: 'Box.glb'
      }
    },
    data: {
      model3dUrl: null
    }
  });
  console.log(`Updated ${result.count} assets to use local fallback!`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
