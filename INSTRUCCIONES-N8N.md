# Sistema de Instancias n8n - Guía de Inicio Rápido

## ✅ Implementación Completada

Se ha integrado exitosamente un sistema completo de suscripciones y provisioning automático de instancias n8n en el portal de clientes de AccesoIT.

## 🚀 Iniciar el Sistema

### 1. Configurar Variables de Entorno

```bash
cd server
cp .env.example .env
```

Editar `server/.env` con tus credenciales:

```bash
# Easypanel (REQUERIDO para producción)
EASYPANEL_URL=http://localhost:3000
EASYPANEL_API_KEY=tu_api_key_aqui
EASYPANEL_PROJECT_ID=default

# Modo desarrollo (deja en true para probar sin Easypanel real)
MOCK_EASYPANEL=true
```

### 2. Inicializar Base de Datos

```bash
cd server
npx prisma migrate dev
npx prisma db seed
```

Esto crea:
- ✓ Usuario admin: `admin@accesoit.com` / `admin123`
- ✓ Plan "Básico n8n" ($10/mes)

### 3. Iniciar Backend

```bash
cd server
npm run dev
```

Backend corre en: http://localhost:3002

### 4. Iniciar Frontend

```bash
# En otra terminal
npm run dev
```

Frontend corre en: http://localhost:5173

## 🧪 Probar el Sistema

### Opción 1: Desde el Dashboard (UI)

1. Ir a http://localhost:5173/login
2. Login: `admin@accesoit.com` / `admin123`
3. Click en tab "n8n"
4. Click botón "Nueva Instancia"
5. Ver la instancia creada con credenciales

### Opción 2: Desde API (Testing)

```bash
# 1. Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@accesoit.com","password":"admin123"}'

# Guardar el token de la respuesta

# 2. Crear instancia
curl -X POST http://localhost:3002/api/n8n/instances/provision \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"

# 3. Listar instancias
curl http://localhost:3002/api/n8n/instances/me \
  -H "Authorization: Bearer <TOKEN>"

# 4. Simular webhook de pago (sin auth)
curl -X POST http://localhost:3002/api/webhooks/payments/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "stripe",
    "event": "subscription.created",
    "customerId": "cus_test123",
    "subscriptionId": "sub_test123",
    "userId": 1,
    "planId": 1,
    "status": "active"
  }'
```

## 📁 Archivos Nuevos Creados

### Backend
- ✅ `server/services/easypanelClient.js` - Cliente API de Easypanel
- ✅ `server/services/n8nProvisioner.js` - Lógica de provisioning (actualizado)
- ✅ `server/routes/n8n.js` - Endpoints REST (actualizado)
- ✅ `server/routes/payments.js` - Webhooks de pagos
- ✅ `server/docs/n8n-instances.md` - Documentación completa
- ✅ `server/prisma/schema.prisma` - Modelos actualizados
- ✅ `server/.env.example` - Variables de entorno

### Frontend
- ✅ `src/components/User/N8nInstancesManager.jsx` - UI de gestión
- ✅ `src/pages/Dashboard.jsx` - Tab n8n integrado

### Base de Datos (migraciones)
- ✅ Modelo `Plan`
- ✅ Modelo `N8nInstance` actualizado con `easypanelServiceId`, `planId`, `status`
- ✅ Modelo `Subscription` actualizado con `planId`

## 🎯 Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/n8n/instances/me` | Listar mis instancias |
| GET | `/api/n8n/instances/:id` | Ver instancia específica |
| POST | `/api/n8n/instances/provision` | Crear nueva instancia |
| PATCH | `/api/n8n/instances/:id/toggle` | Iniciar/detener |
| DELETE | `/api/n8n/instances/:id` | Eliminar instancia |
| GET | `/api/n8n/instances/:id/status` | Estado desde Easypanel |
| GET | `/api/n8n/plans` | Listar planes |
| POST | `/api/webhooks/payments/n8n` | Webhook de pagos |

## 🔧 Configurar Easypanel (Producción)

### 1. Obtener API Key

1. Acceder a Easypanel: `http://<ip-servidor>:3000`
2. Ir a **Settings → API**
3. Generar nueva API key
4. Copiar a `EASYPANEL_API_KEY` en `.env`

### 2. Configurar DNS

En Cloudflare, crear registro CNAME wildcard:

```
*.n8n.accesoit.com.ar → CNAME → <tunnel-o-ip-servidor>
```

### 3. Desactivar Mock

En `server/.env`:

```bash
MOCK_EASYPANEL=false  # Usar Easypanel real
```

## 🔐 Seguridad

### Credenciales por Defecto

- **Admin Portal**: `admin@accesoit.com` / `admin123`
- **n8n Instances**: Se generan aleatoriamente por instancia

⚠️ **IMPORTANTE**: Cambiar password de admin en producción:

```javascript
// Desde consola Node.js o script
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('nueva_password_segura', 10);
// Actualizar en base de datos
```

### Webhooks de Pago

En producción, descomentar validación de firma en `server/routes/payments.js`:

```javascript
// Stripe
const event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);

// MercadoPago
// Verificar x-signature header
```

## 📊 Estructura de Datos

### Plan de Ejemplo

```json
{
  "id": 1,
  "name": "Básico n8n",
  "priceMonthly": 10,
  "features": {
    "workflows": 10,
    "executions": 1000,
    "cpu": "0.5",
    "memory": "1GB"
  }
}
```

### Instancia n8n

```json
{
  "id": 1,
  "slug": "cli1-a3f2",
  "url": "https://cli1-a3f2.n8n.accesoit.com.ar",
  "basicAuthUser": "user_8a3c2f1b",
  "basicAuthPass": "xY7mN9pQ4rS2A1!",
  "status": "running"
}
```

## 🐛 Troubleshooting

### Error: "User already has an active n8n instance"

Solo se permite 1 instancia por usuario. Eliminar la existente primero:

```bash
curl -X DELETE http://localhost:3002/api/n8n/instances/1 \
  -H "Authorization: Bearer <TOKEN>"
```

### Modo Mock No Funciona

Verificar que `MOCK_EASYPANEL=true` está en `.env`.

### Frontend No Conecta

Verificar CORS en `server/index.js` permite `http://localhost:5173`.

## 📖 Documentación Completa

Ver: `server/docs/n8n-instances.md`

- Arquitectura detallada
- Todos los endpoints
- Flujo de provisioning
- Configuración avanzada
- Integración con pasarelas de pago

## ✨ Próximos Pasos

1. **Configurar Easypanel real** (actualmente en modo mock)
2. **Integrar pasarela de pago** (Stripe o MercadoPago)
3. **Configurar SMTP** para emails con credenciales
4. **Agregar más planes** (Pro, Enterprise)
5. **Implementar límites** de uso por plan
6. **Backups automáticos** de instancias

## 🤝 Soporte

Para dudas o problemas:
- Revisar logs: `server/` (console.log)
- Ver documentación: `server/docs/n8n-instances.md`
- Verificar estado de Easypanel (si no es mock)

---

**Estado**: ✅ Sistema completamente funcional en modo desarrollo
