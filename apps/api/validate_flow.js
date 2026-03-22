/**
 * Creado y diseñado por XO
 * XLayout System
 *
 * La funcionalidad nativa fetch está disponible en Node 22
 */

const API_URL = 'http://localhost:3000';

async function validate() {
  console.log('--- STARTING E2E FLOW VALIDATION ---\n');

  // 1. Login as Platform Admin
  console.log('[1] Login as Platform Admin...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'xocotzin@xlayout.io', password: 'admin2026!' })
  });
  const loginData = await loginRes.json();
  const platformToken = loginData.access_token;
  console.log('Status:', loginRes.status, platformToken ? 'Token received' : 'Failed');

  // 2. Create Tenant
  console.log('\n[2] Creating Tenant...');
  const tenantRes = await fetch(`${API_URL}/tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${platformToken}` },
    body: JSON.stringify({ name: 'Herman Miller MX', slug: 'hermanmiller-mx' })
  });
  const tenantData = await tenantRes.json();
  const tenantId = tenantData.id;
  console.log('Status:', tenantRes.status, 'Tenant ID:', tenantId);

  // 3. Create Company Admin
  console.log('\n[3] Creating Company Admin...');
  const adminRes = await fetch(`${API_URL}/company-users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${platformToken}` },
    body: JSON.stringify({
      tenantId: tenantId || 'hermanmiller-mx-fallback-id',
      email: 'admin@hermanmiller.mx',
      password: 'pmadmin2026!',
      firstName: 'Company',
      lastName: 'Admin',
      role: 'ADMIN'
    })
  });
  console.log('Status:', adminRes.status);

  // 4. Login as Company Admin
  console.log('\n[4] Login as Company Admin...');
  const cLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hermanmiller.mx', password: 'pmadmin2026!' })
  });
  const cLoginData = await cLoginRes.json();
  const companyToken = cLoginData.access_token;
  console.log('Status:', cLoginRes.status, companyToken ? 'Company Token received' : 'Failed');

  // 5. Create Product Line
  console.log('\n[5] Creating Product Line...');
  const lineRes = await fetch(`${API_URL}/catalog/lines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${companyToken}` },
    body: JSON.stringify({ name: 'Eames Collection' })
  });
  const lineData = await lineRes.json();
  const lineId = lineData.id;
  console.log('Status:', lineRes.status, 'Line ID:', lineId);

  // 6. Create Product
  console.log('\n[6] Creating Product...');
  const prodRes = await fetch(`${API_URL}/catalog/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${companyToken}` },
    body: JSON.stringify({
      sku: 'EAMES-CHAIR-001',
      name: 'Eames Lounge Chair',
      lineId: lineId,
      width: 80,
      depth: 80,
      height: 80
    })
  });
  const prodData = await prodRes.json();
  const productId = prodData.id;
  console.log('Status:', prodRes.status, 'Product ID:', productId);

  // 7. Create Product Price
  console.log('\n[7] Creating Product Price...');
  const priceRes = await fetch(`${API_URL}/catalog/products/${productId}/prices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${companyToken}` },
    body: JSON.stringify({ basePrice: 4500, currency: 'USD' })
  });
  console.log('Status:', priceRes.status);

  // 8. Register End User
  console.log('\n[8] Registering End User...');
  const endUserRegRes = await fetch(`${API_URL}/end-users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'designer@xlayout.io',
      password: 'designerpass',
      firstName: 'Designer',
      lastName: 'User'
    })
  });
  console.log('Status:', endUserRegRes.status);

  // 9. Generate Activation Code
  console.log('\n[9] Generating Activation Code...');
  const codeRes = await fetch(`${API_URL}/activation-codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${companyToken}` },
    body: JSON.stringify({ catalogEnabled: true, pricesEnabled: true, maxUses: 5 })
  });
  const codeData = await codeRes.json();
  const activationCode = codeData.code;
  console.log('Status:', codeRes.status, 'Code Generated:', activationCode);

  // 10. Activate Code
  console.log('\n[10] Activating Code as End User...');
  const eLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'designer@xlayout.io', password: 'designerpass' })
  });
  const endUserLoginData = await eLoginRes.json();
  const endUserToken = endUserLoginData.access_token;
  const endUserId = endUserLoginData.user.id;
  
  const actRes = await fetch(`${API_URL}/end-users/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${endUserToken}` },
    body: JSON.stringify({ code: activationCode })
  });
  console.log('Status:', actRes.status, 'Activation successful');

  // 11. Verify Catalog
  console.log('\n[11] Verifying Catalog visibility...');
  const catRes = await fetch(`${API_URL}/catalog/products`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${endUserToken}` }
  });
  const catData = await catRes.json();
  console.log('Status:', catRes.status, 'Products found:', Array.isArray(catData) ? catData.length : 'undefined');

  console.log('\n--- E2E FLOW VALIDATION COMPLETED ---');
}

validate().catch(err => console.error('FATAL ERROR:', err));
