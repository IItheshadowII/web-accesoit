###########
# STAGE 1 #
# Build del frontend (Vite)
###########
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app

# Dependencias del frontend (package.json en la raíz del proyecto)
COPY package*.json ./
RUN npm ci

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

ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

# Ajustá si tu backend usa otro script de arranque
CMD ["npm", "run", "start"]
