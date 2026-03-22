/**
 * Creado y diseñado por XO
 * XLayout System
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING DATABASE ---');

  // Create initial Platform User
  const platformUser = await prisma.platformUser.upsert({
    where: { email: 'xocotzin@xlayout.io' },
    update: {},
    create: {
      email: 'xocotzin@xlayout.io',
      passwordHash: Buffer.from('admin2026!').toString('base64'),
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'PLATFORM_OWNER',
      status: 'ACTIVE',
    },
  });
  console.log('Platform Admin created:', platformUser.email);

  console.log('--- SEEDING COMPLETED ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
