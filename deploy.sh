#!/bin/bash
# Creado y diseñado por XO
# ─────────────────────────────────────────────────────────────────────────────
# XLayout — Script de Deploy de Producción
# ─────────────────────────────────────────────────────────────────────────────
# Uso: sudo bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_DIR="/opt/xlayout"

echo -e "${GREEN}═════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  XLayout — Deploy de Producción${NC}"
echo -e "${GREEN}═════════════════════════════════════════════════${NC}"
echo ""

cd "$PROJECT_DIR" || { echo -e "${RED}Error: no se encontró $PROJECT_DIR${NC}"; exit 1; }

# Variables de build
export GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "dev")
export BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export APP_VERSION="1.0.0"
echo -e "${YELLOW}[info]${NC} Build: commit=$GIT_COMMIT date=$BUILD_DATE"

# Paso 1: Build y levantar
echo ""
echo -e "${YELLOW}[1/4]${NC} Construyendo y levantando servicios..."
docker compose -f "$COMPOSE_FILE" up -d --build

# Paso 2: Esperar healthchecks
echo ""
echo -e "${YELLOW}[2/4]${NC} Esperando healthchecks..."
sleep 10
for svc in postgres_prod redis_prod api_prod web_prod; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "xlayout_${svc}" 2>/dev/null || echo "no-health")
    if [ "$STATUS" = "healthy" ]; then
        echo -e "  ${GREEN}✓${NC} $svc → healthy"
    else
        echo -e "  ${RED}✗${NC} $svc → $STATUS"
    fi
done

# Paso 3: Migraciones Prisma
echo ""
echo -e "${YELLOW}[3/4]${NC} Ejecutando migraciones Prisma..."
docker exec xlayout_api_prod npx prisma migrate deploy 2>&1 | tail -3

# Paso 4: Verificación final
echo ""
echo -e "${YELLOW}[4/4]${NC} Validación final..."

# API health
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://api.xlayout.mx/api/health 2>/dev/null || echo "000")
if [ "$API_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} API → HTTPS 200"
else
    echo -e "  ${RED}✗${NC} API → HTTP $API_CODE"
fi

# Web HTTPS
WEB_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://xlayout.mx 2>/dev/null || echo "000")
if [ "$WEB_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} xlayout.mx → HTTPS 200"
else
    echo -e "  ${RED}✗${NC} xlayout.mx → HTTP $WEB_CODE"
fi

# Studio HTTPS
STUDIO_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://xlayout.studio 2>/dev/null || echo "000")
if [ "$STUDIO_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} xlayout.studio → HTTPS 200"
else
    echo -e "  ${RED}✗${NC} xlayout.studio → HTTP $STUDIO_CODE"
fi

echo ""
echo -e "${GREEN}═════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deploy completado${NC}"
echo -e "${GREEN}═════════════════════════════════════════════════${NC}"
echo ""
echo "  🌐 https://xlayout.mx"
echo "  🎨 https://xlayout.studio"
echo "  🔧 https://api.xlayout.mx"
echo ""
