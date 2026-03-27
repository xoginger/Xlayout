const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProjects() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        versions: true,
      }
    });
    
    console.log(`Encontrados ${projects.length} proyectos en la base de datos.`);
    
    projects.forEach(p => {
      console.log(`\nProyecto: ${p.id} | Nombre: ${p.name} | Tenant: ${p.tenantId}`);
      console.log(`Versiones: ${p.versions.length}`);
      if (p.versions.length === 0) {
        console.log(`⚠️ ALERTA: Proyecto sin versiones (Huerfano o Recien Creado)`);
      } else {
        const latest = p.versions.sort((a,b) => b.versionNum - a.versionNum)[0];
        console.log(`- Última versión: ${latest.versionNum} (${latest.createdAt})`);
        // Check if scene state has actual items
        const items = latest.sceneState?.items || [];
        console.log(`- Elementos en escena (última v): ${items.length}`);
      }
    });

  } catch (e) {
    console.error("Error consultando BD:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjects();
