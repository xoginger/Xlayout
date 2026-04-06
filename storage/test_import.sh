#!/bin/bash
# Creado y diseñado por XO
# Script de prueba para importación masiva v2
set -e

API="http://localhost:80/api"
TENANT_ID="843c9ed9-5fce-4111-9839-34949786bed8"

echo "═══════════════════════════════════════════════════"
echo " TEST: Importación Masiva XLayout v2"
echo "═══════════════════════════════════════════════════"

# 1. Obtener token
echo ""
echo ">>> 1. Autenticando..."
TOKEN=$(curl -s "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@pmlapiedad.com","password":"pmadmin2026!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "   ✓ Token obtenido"

# Headers reutilizables
AUTH="Authorization: Bearer $TOKEN"
TENANT="x-tenant-id: $TENANT_ID"

# 2. Descargar plantilla básica
echo ""
echo ">>> 2. Descargando plantilla básica..."
curl -s -o /opt/xlayout/storage/test_template_basic.csv "$API/imports/template/catalog-basic" \
  -H "$AUTH" -H "$TENANT"
echo "   ✓ Plantilla básica descargada"
head -3 /opt/xlayout/storage/test_template_basic.csv

# 3. Descargar plantilla completa
echo ""
echo ">>> 3. Descargando plantilla completa..."
curl -s -o /opt/xlayout/storage/test_template_full.csv "$API/imports/template/catalog-full" \
  -H "$AUTH" -H "$TENANT"
echo "   ✓ Plantilla completa descargada"
head -3 /opt/xlayout/storage/test_template_full.csv

# 4. Crear archivo de prueba con productos base + variantes
echo ""
echo ">>> 4. Creando archivo de prueba (productos + variantes)..."
cat > /opt/xlayout/storage/test_import_v2.csv << 'EOF'
sku,name,base_sku,variant_type,variant_name,line,category,brand,description,width,depth,height,unit,status,price_a,price_b,price_c,price_d,price_e,currency
LOC-TEST-100,Locker Industrial Test,,,,Lockers Test,Almacenamiento,MetalPro,Locker industrial de prueba calibre 22,0.38,0.45,1.80,pza,PUBLISHED,4500,4050,3600,3150,2700,MXN
ESC-TEST-200,Escritorio Operativo Test,,,,Escritorios Test,Mobiliario,OfiLine,Escritorio con cajones de prueba,1.20,0.60,0.75,pza,PUBLISHED,8500,7650,6800,5950,5100,MXN
SIL-TEST-300,Silla Ejecutiva Test,,,,Sillas Test,Mobiliario,ErgoMax,Silla ejecutiva de prueba,0.65,0.68,1.25,pza,PUBLISHED,12000,10800,9600,8400,7200,MXN
LOC-TEST-101,Locker 2 Puertas,LOC-TEST-100,size,2 Puertas,,,,Locker de 2 compartimientos,0.38,0.45,1.80,pza,PUBLISHED,4500,4050,3600,3150,2700,MXN
LOC-TEST-102,Locker 4 Puertas,LOC-TEST-100,size,4 Puertas,,,,Locker de 4 compartimientos,0.76,0.45,1.80,pza,PUBLISHED,8200,7380,6560,5740,4920,MXN
LOC-TEST-103,Locker Arena,LOC-TEST-100,color,Arena,,,,Acabado arena mate,0.38,0.45,1.80,pza,PUBLISHED,4700,4230,3760,3290,2820,MXN
ESC-TEST-201,Escritorio 1.50m,ESC-TEST-200,size,1.50 metros,,,,Versión compacta,1.50,0.60,0.75,pza,PUBLISHED,7800,7020,6240,5460,4680,MXN
ESC-TEST-202,Escritorio 1.80m,ESC-TEST-200,size,1.80 metros,,,,Versión amplia,1.80,0.60,0.75,pza,PUBLISHED,9500,8550,7600,6650,5700,MXN
EOF
echo "   ✓ Archivo creado (3 productos base + 5 variantes)"

# 5. Subir e importar
echo ""
echo ">>> 5. Subiendo archivo de importación..."
UPLOAD_RESULT=$(curl -s "$API/imports/upload" \
  -H "$AUTH" -H "$TENANT" \
  -F "file=@/opt/xlayout/storage/test_import_v2.csv" \
  -F "type=catalog")
echo "   Respuesta: $UPLOAD_RESULT"
JOB_ID=$(echo "$UPLOAD_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('jobId',''))" 2>/dev/null)
echo "   Job ID: $JOB_ID"

# 6. Esperar y consultar estado
echo ""
echo ">>> 6. Esperando procesamiento..."
for i in $(seq 1 15); do
  sleep 2
  STATUS=$(curl -s "$API/imports/$JOB_ID/status" -H "$AUTH" -H "$TENANT")
  STATE=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null)
  echo "   Intento $i: estado=$STATE"
  if [ "$STATE" = "completed" ] || [ "$STATE" = "COMPLETED" ] || [ "$STATE" = "failed" ] || [ "$STATE" = "FAILED" ]; then
    break
  fi
done

echo ""
echo ">>> 7. Resultado final:"
echo "$STATUS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
r = d.get('result', d.get('summary', {}))
if r:
    print(f'   Tipo: {r.get(\"type\",\"?\")}')
    print(f'   Total filas: {r.get(\"total\",0)}')
    print(f'   Exitosos: {r.get(\"succeeded\",0)}')
    print(f'   Creados: {r.get(\"created\",0)}')
    print(f'   Actualizados: {r.get(\"updated\",0)}')
    print(f'   Variantes: {r.get(\"variantsCreated\",0)}')
    print(f'   Fallidos: {r.get(\"failed\",0)}')
    lines = r.get('linesCreated', [])
    if lines: print(f'   Líneas nuevas: {lines}')
    cats = r.get('categoriesCreated', [])
    if cats: print(f'   Categorías nuevas: {cats}')
    errors = r.get('errors', [])
    if errors:
        print(f'   Errores ({len(errors)}):')
        for e in errors[:10]:
            print(f'     - {e}')
else:
    print(json.dumps(d, indent=2))
" 2>/dev/null || echo "$STATUS"

# 8. Crear archivo con errores intencionales
echo ""
echo ">>> 8. Probando con errores intencionales..."
cat > /opt/xlayout/storage/test_import_errors.csv << 'EOF'
sku,name,base_sku,variant_type,line,category,width,depth,height,price_a,currency
,Producto sin SKU,,,Linea X,,1,1,1,100,MXN
ERR-001,,,,Linea Y,,1,1,1,200,MXN
ERR-002,Producto Sin Linea,,,,,,1,1,300,MXN
ERR-003,Producto Dim Invalida,,,Linea Z,,abc,def,ghi,400,MXN
ERR-004,Producto Precio Negativo,,,Linea Z,,1,1,1,-500,MXN
ERR-005,Variante Fantasma,NOEXISTE-999,size,,,1,1,1,600,MXN
ERR-003,SKU Duplicado en Archivo,,,Linea Z,,1,1,1,700,MXN
EOF

UPLOAD_ERR=$(curl -s "$API/imports/upload" \
  -H "$AUTH" -H "$TENANT" \
  -F "file=@/opt/xlayout/storage/test_import_errors.csv" \
  -F "type=catalog")
ERR_JOB_ID=$(echo "$UPLOAD_ERR" | python3 -c "import sys,json; print(json.load(sys.stdin).get('jobId',''))" 2>/dev/null)
echo "   Job errores ID: $ERR_JOB_ID"

sleep 8
ERR_STATUS=$(curl -s "$API/imports/$ERR_JOB_ID/status" -H "$AUTH" -H "$TENANT")
echo ""
echo ">>> 9. Resultado de errores:"
echo "$ERR_STATUS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
r = d.get('result', d.get('summary', {}))
if r:
    print(f'   Total filas: {r.get(\"total\",0)}')
    print(f'   Exitosos: {r.get(\"succeeded\",0)}')
    print(f'   Fallidos: {r.get(\"failed\",0)}')
    errors = r.get('errors', [])
    if errors:
        print(f'   Errores detectados ({len(errors)}):')
        for e in errors[:15]:
            print(f'     ✗ {e}')
else:
    print(json.dumps(d, indent=2))
" 2>/dev/null || echo "$ERR_STATUS"

# 10. Reimportar para verificar idempotencia
echo ""
echo ">>> 10. Reimportando mismo archivo (test idempotencia)..."
REUP=$(curl -s "$API/imports/upload" \
  -H "$AUTH" -H "$TENANT" \
  -F "file=@/opt/xlayout/storage/test_import_v2.csv" \
  -F "type=catalog")
REUP_JOB_ID=$(echo "$REUP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('jobId',''))" 2>/dev/null)
sleep 8
REUP_STATUS=$(curl -s "$API/imports/$REUP_JOB_ID/status" -H "$AUTH" -H "$TENANT")
echo "$REUP_STATUS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
r = d.get('result', d.get('summary', {}))
if r:
    print(f'   Total: {r.get(\"total\",0)} | Creados: {r.get(\"created\",0)} | Actualizados: {r.get(\"updated\",0)} | Variantes: {r.get(\"variantsCreated\",0)} | Errores: {r.get(\"failed\",0)}')
    if r.get('created',0) == 0 and r.get('updated',0) > 0:
        print('   ✓ IDEMPOTENCIA CORRECTA: los productos existentes se actualizaron, no se duplicaron')
    else:
        print('   ⚠ Verificar: se esperaba 0 creaciones y N actualizaciones')
else:
    print(json.dumps(d, indent=2))
" 2>/dev/null

echo ""
echo "═══════════════════════════════════════════════════"
echo " TESTS COMPLETADOS"
echo "═══════════════════════════════════════════════════"
