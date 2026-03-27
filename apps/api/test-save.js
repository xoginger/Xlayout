const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function myFetch(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json();
  if (!res.ok) throw { message: data.message || res.statusText, response: { data } };
  return { data };
}

async function runTest() {
  try {
    console.log("=== INICIANDO VALIDACIÓN DE GUARDADO ===");
    
    let user = await prisma.distributorUser.findFirst();
    let userType = 'DISTRIBUTOR_USER';
    
    if (!user) {
      user = await prisma.companyUser.findFirst();
      userType = 'COMPANY_USER';
    }

    if (!user) {
      console.log("No users found to test.");
      return;
    }

    console.log(`Usando usuario ${user.email} (${userType}) para probar API...`);

    let loginRes;
    try {
      loginRes = await myFetch('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: user.email, password: 'password123' })
      });
    } catch (e) {
      console.log("Error login. Intentando admin...");
      loginRes = await myFetch('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@distribuidor.com', password: 'password123' })
      });
    }

    const token = loginRes.data.access_token;
    const tenantId = loginRes.data.user.tenantId || (await prisma.tenant.findFirst()).id;
    console.log("Login exitoso. Token obtenido.");

    const headers = { 
      Authorization: `Bearer ${token}`,
      'x-tenant-id': tenantId
    };

    console.log(`\n=> POST /api/projects`);
    const createRes = await myFetch('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: "Proyecto Test " + new Date().getTime() }),
      headers
    });

    const projectId = createRes.data.id;
    console.log("Proyecto creado exitosamente! ID:", projectId);

    console.log(`\n=> POST /api/projects/${projectId}/versions`);
    const sceneState = {
      items: [{ id: "item1", productId: "prod1", position: [0,0,0], rotation: [0,0,0] }],
      walls: [],
      openings: []
    };
    
    const versionRes = await myFetch(`http://localhost/api/projects/${projectId}/versions`, {
      method: 'POST',
      body: JSON.stringify({ sceneState }),
      headers
    });

    console.log("Versión guardada exitosamente! ID:", versionRes.data.id);

    console.log(`\n=> Verificando DB...`);
    const dbProjects = await prisma.project.count();
    const dbVersions = await prisma.projectVersion.count();
    
    console.log(`Total Projects en DB: ${dbProjects}`);
    console.log(`Total Versions en DB: ${dbVersions}`);

    console.log(`\n=> GET /api/projects`);
    const listRes = await myFetch('http://localhost/api/projects', { headers });
    console.log(`El API lista ${listRes.data.length} proyectos.`);

    console.log(`\n=> GET /api/projects/${projectId}`);
    const loadRes = await myFetch(`http://localhost/api/projects/${projectId}`, { headers });
    console.log(`Proyecto cargado. Versiones encontradas: ${loadRes.data.versions.length}`);

    console.log("\n=== VALIDACIÓN EXITOSA ===");
  } catch (e) {
    console.error("ERROR EN VALIDACIÓN:", e.response?.data || e.message);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
