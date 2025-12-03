# Multi-stage build for production

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
COPY . .
RUN npm install
RUN npm run build

# Stage 2: Backend runtime
FROM node:20-alpine
WORKDIR /app

# Copy backend files
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --production

# Copy backend source
COPY server/ ./

# Generate Prisma client at build time
RUN npx prisma generate

# Copy frontend build from previous stage
COPY --from=frontend-builder /app/dist /app/dist

# Expose port
EXPOSE 3002

# Environment defaults
ENV NODE_ENV=production \
	PORT=3002

# Start backend (run Prisma generate/migrate, then serve frontend+API)
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && node index.js"]
