###########
# STAGE 1 #
# Build del frontend (Vite)
###########
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app

# Dependencias del frontend (package.json en la raíz del proyecto)
COPY package*.json ./
RUN npm ci

# Allow passing VITE_* variables at build time so Vite includes them in the bundle
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

# Copiamos config y entry de Vite
COPY vite.config.* tsconfig.* ./
COPY index.html ./

# Código del frontend
COPY src ./src
COPY public ./public

# Build de Vite -> genera /app/dist
RUN npm run build


###########
# STAGE 2 #
# Backend + Prisma + servir estáticos del frontend
###########
FROM node:20-bookworm-slim AS server

# OpenSSL para Prisma
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

# Dependencias del backend (package.json dentro de /server)
COPY server/package*.json ./
RUN npm ci --omit=dev

# Código del backend (incluye prisma/, src/, etc.)
COPY server/ ./

# Copiamos el build del frontend al backend para servirlo como estático
COPY --from=frontend-builder /app/dist ./public

# Generar Prisma Client en la imagen
RUN npx prisma generate

# Crear script de inicio que ejecute migraciones antes de arrancar
ENV PRISMA_SCHEMA=/app/server/prisma/schema.prisma

RUN echo '#!/bin/bash\n\
set -e\n\
echo "🔄 Syncing Prisma schema to database (db push)..."\n\
npx prisma db push --schema "$PRISMA_SCHEMA"\n\
echo "🌱 Running seed (if needed)..."\n\
npx prisma db seed || echo "Seed skipped"\n\
echo "✅ Starting server..."\n\
exec npm run start' > /app/server/docker-entrypoint.sh \
    && chmod +x /app/server/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

# Usar el script de inicio en vez de npm start directo
CMD ["/app/server/docker-entrypoint.sh"]
