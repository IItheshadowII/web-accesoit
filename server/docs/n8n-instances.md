# Sistema de Instancias n8n

Sistema integrado de suscripciones y provisioning automático de instancias n8n en Easypanel para el portal de clientes de AccesoIT.

## Arquitectura

```
Portal Cliente → Webhook Pago → Backend → Easypanel API → Contenedor n8n
                                    ↓
                                 Base de Datos (Prisma)
```

## Modelos de Datos

### Plan
```prisma
model Plan {
  id              Int      @id @default(autoincrement())
  name            String   @unique
  description     String?
  priceMonthly    Float
  features        String   // JSON
  active          Boolean  @default(true)
  subscriptions   Subscription[]
  n8nInstances    N8nInstance[]
}
```

### Subscription
```prisma
model Subscription {
  id                 Int      @id @default(autoincrement())
  userId             Int
  planId             Int?
  provider           String   // 'stripe', 'mercadopago'
  providerCustomerId String
  providerSubId      String
  status             String   // 'active', 'past_due', 'canceled'
}
```

### N8nInstance
```prisma
model N8nInstance {
  id                  Int      @id @default(autoincrement())
  userId              Int
  planId              Int?
  slug                String   @unique
  url                 String
  easypanelServiceId  String?
  basicAuthUser       String
  basicAuthPass       String
  encryptionKey       String
  status              String   // 'creating', 'running', 'stopped', 'error', 'cancelled'
}
```

## Endpoints de API

### Instancias n8n

#### `GET /api/n8n/instances/me`
Lista las instancias del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "slug": "cli1-a3f2",
    "url": "https://cli1-a3f2.n8n.accesoit.com.ar",
    "status": "running",
    "plan": {
      "name": "Básico n8n",
      "priceMonthly": 10
    },
    "createdAt": "2025-12-03T10:00:00Z"
  }
]
```

#### `POST /api/n8n/instances/provision`
Crea una nueva instancia n8n.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "planId": 1  // Opcional
}
```

**Response:**
```json
{
  "success": true,
  "instance": {
    "id": 1,
    "slug": "cli1-a3f2",
    "url": "https://cli1-a3f2.n8n.accesoit.com.ar",
    "basicAuthUser": "user_8a3c2f1b",
    "basicAuthPass": "xY7mN9pQ4rS2A1!",
    "status": "running"
  }
}
```

#### `PATCH /api/n8n/instances/:id/toggle`
Alterna el estado de la instancia (running ↔ stopped).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Instance stopped"
}
```

#### `DELETE /api/n8n/instances/:id`
Elimina una instancia (soft delete por defecto).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "hardDelete": false  // true para eliminar también volúmenes
}
```

**Response:**
```json
{
  "success": true,
  "message": "Instance deleted"
}
```

#### `GET /api/n8n/instances/:id/status`
Obtiene el estado en tiempo real desde Easypanel.

**Response:**
```json
{
  "status": "running",
  "containerStatus": "healthy",
  "uptime": "2h 30m",
  "cpu": "5%",
  "memory": "512MB"
}
```

#### `GET /api/n8n/plans`
Lista los planes disponibles.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Básico n8n",
    "description": "Automatización básica",
    "priceMonthly": 10,
    "features": "{\"workflows\": 10, \"executions\": 1000}",
    "active": true
  }
]
```

### Webhooks de Pago

#### `POST /api/webhooks/payments/n8n`
Recibe eventos de pasarelas de pago (Stripe/MercadoPago).

**Body (stub):**
```json
{
  "provider": "stripe",
  "event": "subscription.created",
  "customerId": "cus_xxx",
  "subscriptionId": "sub_xxx",
  "userId": 123,
  "planId": 1,
  "status": "active",
  "signature": "..."
}
```

**Eventos soportados:**
- `subscription.created` / `subscription.activated` → Provisiona instancia
- `subscription.updated` → Suspende si status = past_due/canceled
- `subscription.cancelled` / `subscription.deleted` → Cancela instancia

## Flujo de Provisioning

1. **Usuario solicita instancia** desde Dashboard o vía webhook de pago
2. **Backend valida** usuario y verifica duplicados
3. **Genera credenciales**:
   - Slug único: `cli{userId}-{random}`
   - Basic Auth User: `user_{random}`
   - Basic Auth Pass: `{random}A1!`
   - Encryption Key: `{random32hex}`
4. **Crea registro en DB** con status `creating`
5. **Llama a Easypanel API** para crear contenedor Docker:
   ```javascript
   {
     name: "n8n-{slug}",
     image: "n8nio/n8n:latest",
     domains: [{ host: "{slug}.n8n.accesoit.com.ar", port: 5678, https: true }],
     env: {
       N8N_HOST: "{slug}.n8n.accesoit.com.ar",
       N8N_PROTOCOL: "https",
       N8N_BASIC_AUTH_ACTIVE: "true",
       N8N_BASIC_AUTH_USER: "{user}",
       N8N_BASIC_AUTH_PASSWORD: "{pass}",
       N8N_ENCRYPTION_KEY: "{key}"
     },
     volumes: [{ name: "n8n-data-{slug}", mountPath: "/home/node/.n8n" }],
     resources: { cpuLimit: "0.5", memoryLimit: "1024M" }
   }
   ```
6. **Actualiza DB** con `easypanelServiceId` y status `running`
7. **Envía email** con credenciales (stub)

## Configuración

### Variables de Entorno

Copiar `server/.env.example` a `server/.env` y completar:

```bash
# Easypanel (REQUERIDO)
EASYPANEL_URL=http://localhost:3000
EASYPANEL_API_KEY=your_api_key_here
EASYPANEL_PROJECT_ID=default

# Modo desarrollo (opcional)
MOCK_EASYPANEL=true  # Simula llamadas a Easypanel sin hacer requests reales

# Pasarela de pagos (opcional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
```

### DNS en Cloudflare

Crear un registro CNAME wildcard:

```
*.n8n.accesoit.com.ar CNAME <tunnel-cloudflare>
```

O apuntar directamente a la IP de Easypanel:

```
*.n8n.accesoit.com.ar A <ip-servidor-easypanel>
```

### Easypanel

1. Acceder al panel de Easypanel
2. Ir a **Settings → API**
3. Generar un nuevo API key
4. Copiar el key a `EASYPANEL_API_KEY`

## Testing

### Crear instancia manualmente

```bash
curl -X POST http://localhost:3002/api/n8n/instances/provision \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"planId": 1}'
```

### Simular webhook de pago

```bash
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

### Listar instancias

```bash
curl http://localhost:3002/api/n8n/instances/me \
  -H "Authorization: Bearer <token>"
```

## Modo Desarrollo

Si `MOCK_EASYPANEL=true`, el sistema simula las operaciones sin hacer llamadas reales:

- `createN8nService()` → Devuelve ID mock
- `getServiceStatus()` → Devuelve estado "running"
- `stopService()` / `startService()` → Log sin acción
- `deleteService()` → Log sin acción

Esto permite desarrollar y probar el flujo completo sin tener Easypanel configurado.

## Componentes Frontend

### N8nInstancesManager

Componente React que gestiona la UI de instancias:

```jsx
import N8nInstancesManager from '../components/User/N8nInstancesManager';

<N8nInstancesManager />
```

**Características:**
- Lista de instancias con badges de estado
- Botón "Abrir n8n" (abre en nueva pestaña)
- Toggle Start/Stop
- Eliminar con confirmación
- Loading states y manejo de errores
- Animaciones con Framer Motion

### Integración en Dashboard

En `src/pages/Dashboard.jsx`, agregar tab "Mis Instancias n8n":

```jsx
{activeTab === 'n8n' && (
  <>
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">Mis Instancias n8n</h2>
      <Button onClick={handleCreateInstance}>
        Nueva Instancia
      </Button>
    </div>
    <N8nInstancesManager />
  </>
)}
```

## Ciclo de Vida

### Creación
1. Usuario solicita → `status = creating`
2. Easypanel aprovisiona → `status = running`
3. Email enviado con credenciales

### Suspensión (pago vencido)
1. Webhook recibe `status = past_due`
2. Backend actualiza → `status = stopped`
3. Contenedor detenido en Easypanel

### Cancelación
1. Webhook recibe `event = subscription.cancelled`
2. Backend actualiza → `status = cancelled`
3. Contenedor eliminado (volumen preservado X días)

### Eliminación definitiva
1. Usuario solicita eliminar desde Dashboard
2. `hardDelete = false` → Contenedor eliminado, volumen preservado
3. `hardDelete = true` → Contenedor y volumen eliminados

## Seguridad

### Credenciales
- **Basic Auth**: Se genera aleatoriamente y se envía al usuario
- **Encryption Key**: Crítico para n8n - se genera y guarda en DB
- **Recomendación**: Usuario debe cambiar contraseña en primer login

### Autenticación
- Todos los endpoints protegidos con JWT
- Verificación de ownership (usuario solo ve sus instancias)
- Admin puede ver todas las instancias

### Validación de Webhooks
En producción, validar firmas:

**Stripe:**
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const event = stripe.webhooks.constructEvent(
  req.body,
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET
);
```

**MercadoPago:**
```javascript
// Validar x-signature header
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');
```

## Troubleshooting

### Error: "User already has an active n8n instance"
Solo se permite 1 instancia activa por usuario. Eliminar la existente primero.

### Error: "Easypanel API error: 401"
Verificar `EASYPANEL_API_KEY` en `.env`.

### Instancia en estado "creating" permanente
Verificar logs de Easypanel. Posible error en creación de contenedor.

### DNS no resuelve
Verificar registro CNAME wildcard en Cloudflare apunta correctamente.

### n8n muestra "Bad Gateway"
- Contenedor puede estar arrancando (esperar 30-60 seg)
- Verificar que puerto 5678 está expuesto
- Verificar logs del contenedor en Easypanel

## Roadmap

- [ ] Panel de uso/consumo por instancia
- [ ] Límites de workflows según plan
- [ ] Auto-scaling de recursos
- [ ] Backups automáticos programados
- [ ] Integración con facturación
- [ ] Multi-tenant DB (Postgres por instancia)
- [ ] Metrics y alertas (Prometheus/Grafana)

## Referencias

- [n8n Documentation](https://docs.n8n.io/)
- [Easypanel API](https://easypanel.io/docs/api)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [MercadoPago Webhooks](https://www.mercadopago.com.ar/developers/es/docs/webhooks)
