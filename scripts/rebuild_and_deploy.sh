#!/usr/bin/env bash
set -euo pipefail

# Usage:
# VITE_GOOGLE_CLIENT_ID=<your-client-id> ./scripts/rebuild_and_deploy.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ -z "${VITE_GOOGLE_CLIENT_ID:-}" ]; then
  echo "Error: VITE_GOOGLE_CLIENT_ID is not set."
  echo "Run as: VITE_GOOGLE_CLIENT_ID=... ./scripts/rebuild_and_deploy.sh"
  exit 1
fi

echo "Pulling latest code..."
git pull origin main

echo "Building Docker image with VITE_GOOGLE_CLIENT_ID..."
docker build --build-arg VITE_GOOGLE_CLIENT_ID="$VITE_GOOGLE_CLIENT_ID" -t web-accesoit:latest .

CONTAINER_NAME=web-accesoit

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Stopping and removing existing container ${CONTAINER_NAME}..."
  docker stop "${CONTAINER_NAME}" || true
  docker rm "${CONTAINER_NAME}" || true
fi

echo "Starting new container ${CONTAINER_NAME}..."
# Expose port 80 -> 3002 inside container; adjust as needed.
docker run -d --name "${CONTAINER_NAME}" -p 80:3002 --env-file server/.env web-accesoit:latest

echo "Deployment finished. Check logs with: docker logs -f ${CONTAINER_NAME}"
