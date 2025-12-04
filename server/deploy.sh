#!/bin/bash
set -e

echo "🚀 Iniciando deploy..."

# Generar Prisma Client
echo "📦 Generando Prisma Client..."
npx prisma generate

# Aplicar migraciones
echo "🗄️  Aplicando migraciones..."
npx prisma migrate deploy

# Ejecutar seed (si no existe el admin o planes)
echo "🌱 Ejecutando seed..."
npx prisma db seed || echo "⚠️  Seed falló (puede ser normal si ya existe data)"

echo "✅ Deploy completado!"
