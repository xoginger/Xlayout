#!/bin/bash
set -e

echo "============================================="
echo " XLayout Deployment Script (Contabo VPS/Ubuntu) "
echo "============================================="

# 1. Update system & Dependencies
echo "[1/4] Updating system and installing dependencies..."
sudo apt-get update -y
sudo apt-get install -y docker.io docker-compose curl gettext-base

# 2. Create Required Structure
echo "[2/4] Creating Directory Structure Structure..."
sudo mkdir -p /opt/xlayout/storage/{images,models,exports,imports,spatial-imports,logs}
sudo chmod -R 775 /opt/xlayout/storage

# 3. Pull / Build Containers
echo "[3/4] Building and launching Docker containers..."
cd /opt/xlayout || exit 1
sudo docker-compose up -d --build

# 4. Wait & Run Migrations / Seed
echo "[4/4] Executing Database Migrations and Seeding..."
echo "Waiting for PostgreSQL to be ready..."
sleep 10

sudo docker-compose exec -T api npx prisma migrate deploy
sudo docker-compose exec -T api npx ts-node prisma/seed.ts

echo "============================================="
echo " Deployment Complete! "
echo " Access the platform via http://SERVER_IP "
echo " API Docs at http://SERVER_IP/api/docs "
echo "============================================="
