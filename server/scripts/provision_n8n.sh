#!/bin/bash
set -e

# Argumentos recibidos del backend
SLUG=$1
USER=$2
PASS=$3
ENC_KEY=$4

# Directorio de datos persistente en el host
DATA_DIR="/data/n8n/${SLUG}"
mkdir -p "$DATA_DIR"

# Asegurar permisos para el usuario node (1000:1000) dentro del contenedor
# Esto es crítico para que n8n pueda escribir en el volumen
chown -R 1000:1000 "$DATA_DIR"

# Ejecutar el contenedor n8n
# Se asume que existe una red Docker llamada 'traefik_proxy' y Traefik está corriendo
docker run -d \
  --name "n8n_${SLUG}" \
  --restart unless-stopped \
  --cpus="0.5" \
  --memory="1g" \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER="$USER" \
  -e N8N_BASIC_AUTH_PASSWORD="$PASS" \
  -e N8N_ENCRYPTION_KEY="$ENC_KEY" \
  -e N8N_HOST="${SLUG}.n8n.accesoit.com.ar" \
  -e N8N_PORT=5678 \
  -e N8N_PROTOCOL=https \
  -e WEBHOOK_URL="https://${SLUG}.n8n.accesoit.com.ar/" \
  -e N8N_PAYLOAD_SIZE_MAX=16 \
  -v "${DATA_DIR}:/home/node/.n8n" \
  --network traefik_proxy \
  -l "traefik.enable=true" \
  -l "traefik.http.routers.n8n_${SLUG}.rule=Host(\`${SLUG}.n8n.accesoit.com.ar\`)" \
  -l "traefik.http.services.n8n_${SLUG}.loadbalancer.server.port=5678" \
  n8nio/n8n:latest

echo "Instancia n8n_${SLUG} desplegada correctamente."
