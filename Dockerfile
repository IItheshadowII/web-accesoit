###########
# STAGE 1 #
# Build del frontend (Vite)
###########
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app

# Dependencias del frontend (ajustá si tu package.json está en otro lado)
COPY package*.json ./
RUN npm ci

# Copiamos el código del frontend
COPY vite.config.* tsconfig.* ./
COPY src ./src
COPY public ./public

# Build de Vite -> genera /app/dist
RUN npm run build


###########
# STAGE 2 #
# Backend + Prisma + servir estáticos del frontend
###########
FROM node:20-bookworm-slim AS server

# Instalar OpenSSL para que Prisma funcione bien
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

# Dependencias del backend (ajustá si tu package.json está en otra ruta)
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copiamos el código del backend (incluye prisma/, src/, etc.)
COPY server/ ./

# Copiamos el build del frontend dentro del backend (para servir estáticos)
# Ajustá la ruta de destino si tu backend sirve archivos desde otra carpeta
COPY --from=frontend-builder /app/dist ./public

# Generar Prisma Client dentro de la imagen
RUN npx prisma generate

# Variables por defecto (Easypanel puede sobreescribirlas)
ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

# Ajustá el comando según tus scripts de package.json del backend:
#  - "start"          -> node index.js / ts-node / etc.
#  - "start:prod"     -> si tenés un build de TypeScript, por ejemplo.
CMD ["npm", "run", "start"]
