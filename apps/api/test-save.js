const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runValidation() {
  console.log('--- VALIDATING DB ---');
  try {
    const projectsCount = await prisma.project.count();
    const versionsCount = await prisma.projectVersion.count();

    console.log(`> Total Projects: ${projectsCount}`);
    console.log(`> Total Versions: ${versionsCount}`);

    if (projectsCount === 0 || versionsCount === 0) {
      console.log('STATUS: The UI test is absolutely needed to insert records.');
    } else {
      console.log('STATUS: Database contains actual data!');
    }
  } catch (error) {
    console.error('Validation Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runValidation();
