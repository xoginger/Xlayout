#!/bin/bash
echo "🔥 Desplegando en PRODUCCIÓN (/opt/xlayout)..."
cd /opt/xlayout
git checkout main
git pull origin main
docker compose --env-file .env.production -f docker-compose.prod.yml down
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api_prod npx prisma migrate deploy
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api_prod npx prisma db seed
echo "✅ Producción desplegada correctamente en puerto 80"
