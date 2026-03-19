#!/bin/bash
echo "🚀 Desplegando en STAGING (/opt/xlayout)..."
cd /opt/xlayout
git checkout develop
git pull origin develop
docker compose -f docker-compose.staging.yml down
docker compose -f docker-compose.staging.yml up -d --build
docker compose -f docker-compose.staging.yml exec -T api_staging npx prisma migrate deploy
docker compose -f docker-compose.staging.yml exec -T api_staging npx prisma db seed
echo "✅ Staging desplegado correctamente en puerto 8081"
