# Proyecto: Plataforma de n8n “as-a-Service” sobre Proxmox

## 1. Objetivo
Montar un servicio de suscripción donde un cliente paga (ej. **USD 10/mes**) y automáticamente se le aprovisiona **su propia instancia aislada de n8n**, accesible por un subdominio, con credenciales iniciales aleatorias enviadas por mail.

La solución debe:
- Integrarse con el **portal de clientes** existente.
- Correr inicialmente en tu **NUC con Proxmox**.
- Ser fácil de **escalar** sumando, en el futuro, un nodo Proxmox en OVH al clúster.

---

## 2. Alcance
Incluye:
- Diseño de arquitectura.
- Backend de provisión (“Provisioner API”).
- Integración con pasarela de pago (Stripe / MercadoPago u otra).
- Integración con el portal de clientes.
- Provisión automática de instancias n8n (contenedores Docker).
- Gestión de ciclo de vida: alta, suspensión, baja.
- Plan para escalar a nuevos nodos Proxmox (ej. OVH).

No incluye (por ahora):
- Panel de uso/consumo avanzado por instancia.
- Balanceo multi-nodo automático (se deja preparado el modelo para ello).

---

## 3. Arquitectura general

### 3.1 Componentes
1. **Portal de Clientes (frontend)**  
   - Agregar: “Planes n8n” y “Mis instancias n8n”.

2. **Provisioner API (backend propio)**  
   - Node.js + TypeScript (NestJS/Express).
   - Conexiones: Pasarela de pagos (webhooks), Proxmox host (SSH), Cloudflare (API DNS), Mail (SMTP/SendGrid), DB.

3. **Base de datos**  
   - Postgres recomendado.

4. **Host de instancias n8n**  
   - VM en Proxmox (Ubuntu Server).  
   - Docker + Traefik/NGINX.  
   - Cada cliente = 1 contenedor n8n + volumen dedicado.

5. **Pasarela de pago**  
   - Stripe / MercadoPago (suscripciones).

6. **DNS/SSL**  
   - Cloudflare: subdominios tipo `cliente123.n8n.accesoit.com.ar` + HTTPS.

---

## 4. Infraestructura en Proxmox

### 4.1 Estado inicial (NUC)
Crear **dos VMs**:

- **VM `n8n-host-01`**  
  - Ubuntu Server LTS, 4 vCPU / 8 GB RAM / 80–100 GB disco (ajustable).  
  - Docker + Traefik.  
  - Hospeda contenedores n8n.

- **VM `provisioner-api-01`**  
  - Ubuntu Server LTS, 2 vCPU / 4 GB RAM / 40 GB disco.  
  - Corre el backend Provisioner API y DB Postgres (al inicio puede ser la misma VM).

### 4.2 Futuro: OVH + clúster
- Sumar nodo OVH a Proxmox.
- Crear `n8n-host-02`, `n8n-host-03` según demanda.
- El modelo de datos ya contempla un campo `host` por instancia para colocarla en la VM correcta.

---

## 5. Diseño del backend (Provisioner API)

### 5.1 Stack sugerido
- **Node.js + TypeScript** (NestJS recomendado).
- **ORM**: Prisma/TypeORM.
- **DB**: Postgres.
- **Auth**: El portal ya autentica; exponer API internamente o con API Key.

### 5.2 Modelos de datos (simplificado)
```ts
Client {
  id              Int      @id @default(autoincrement())
  email           String   @unique
  name            String
  createdAt       DateTime @default(now())
}

Subscription {
  id                 Int      @id @default(autoincrement())
  clientId           Int
  provider           String   // 'stripe', 'mercadopago', etc.
  providerCustomerId String
  providerSubId      String
  status             String   // 'active', 'past_due', 'canceled'
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

N8nInstance {
  id             Int      @id @default(autoincrement())
  clientId       Int
  slug           String   @unique   // ej. 'cli-123'
  url            String
  host           String   // ej. 'n8n-host-01'
  basicAuthUser  String
  basicAuthPass  String
  encryptionKey  String   // CRÍTICO: Para persistir credenciales entre reinicios
  status         String   // 'provisioning','active','suspended','deleted'
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### 5.3 Endpoints principales
- `POST /webhooks/payments/n8n`  
  Recibe notificaciones de la pasarela → crea/actualiza `Subscription` → si queda **active** → provisiona.
- `GET /clients/:id/instances`  
  Lista instancias para mostrarlas en el portal.
- `POST /webhooks/payments/n8n/cancel`  
  Cancela suscripción → suspende/baja la instancia (con backup si aplica).

---

## 6. Proceso de provisión de una instancia n8n

### 6.1 Flujo lógico
1. Webhook de pago llega al backend.
2. Backend valida firma y cliente; actualiza `Subscription`.
3. Llama a `provisionN8nInstance(client)`:
   - Decide host (por ahora `n8n-host-01`).  
   - Genera `slug`, `basicAuthUser`, `basicAuthPass`.
   - Crea DNS en Cloudflare (`A` hacia IP pública del host).
   - Ejecuta por **SSH** un script en `n8n-host-01`.
   - Health-check; guarda `N8nInstance` en DB `status='active'`.
   - Envía email con credenciales.

### 6.2 Script de provisión en `n8n-host-01` (`/opt/scripts/provision_n8n.sh`)
```bash
#!/bin/bash
set -e

SLUG=$1
USER=$2
PASS=$3
ENC_KEY=$4

DATA_DIR="/data/n8n/${SLUG}"
mkdir -p "$DATA_DIR"
# Asegurar permisos para el usuario node (1000:1000) dentro del contenedor
chown -R 1000:1000 "$DATA_DIR"

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
```
> **Mejoras**: Se agregan límites de CPU/RAM, `N8N_ENCRYPTION_KEY` y permisos de carpeta.

### 6.3 Llamar el script desde el backend (ejemplo)
```ts
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import { randomBytes } from 'crypto';
const exec = promisify(execCb);

export async function provisionN8nInstance(client: Client) {
  const slug = `cli${client.id}`;
  const basicAuthUser = `user_${Math.random().toString(36).slice(2, 8)}`;
  const basicAuthPass = Math.random().toString(36).slice(2, 14) + 'A1!';
  const encryptionKey = randomBytes(16).toString('hex'); // Generar key única

  await createCloudflareRecord(
    `${slug}.n8n.accesoit.com.ar`,
    'A',
    process.env.N8N_HOST_IP!,
  );

  // NOTA: En producción, usar una librería SSH segura o API de Docker, no exec directo.
  const sshCmd = `ssh root@${process.env.N8N_HOST_IP} "/opt/scripts/provision_n8n.sh ${slug} ${basicAuthUser} ${basicAuthPass} ${encryptionKey}"`;
  await exec(sshCmd);

  const instance = await db.n8nInstance.create({
    data: {
      clientId: client.id,
      slug,
      url: `https://${slug}.n8n.accesoit.com.ar`,
      host: 'n8n-host-01',
      basicAuthUser,
      basicAuthPass,
      encryptionKey,
      status: 'active',
    },
  });

  await sendCredentialsEmail(client.email, instance);
  return instance;
}
```

---

## 7. Integración con el portal de clientes

### 7.1 UX / pantallas
- **Planes n8n**: info + botón “Contratar (USD 10/mes)”.  
- **Mis instancias**: consume `GET /clients/:id/instances`, muestra URL/estado y botón “Abrir n8n”.  
- Aviso: “Cambiar credenciales después del primer login”.

### 7.2 Flujo completo
Portal → Checkout pasarela → Webhook en backend → Provisión → Mail al cliente → Portal muestra la instancia.

---

## 8. Ciclo de vida y escalabilidad

### 8.1 Suspensión/baja
- Webhook “suscripción cancelada”:
  - `Subscription.status='canceled'`.
  - `N8nInstance.status='suspended'` y `docker stop n8n_${SLUG}`.
- Baja definitiva (pasado el período de gracia):
  - Backup del volumen (`/data/n8n/${SLUG}`) → borrar contenedor y datos.

### 8.2 Escalar a OVH
- Agregar nodo al clúster Proxmox.
- Crear `n8n-host-02` (misma config).  
- Campo `host` ya permite elegir VM destino.  
- Estrategia simple: round-robin por cantidad de instancias.

---

## 9. Seguridad y Mantenimiento
- **N8N_ENCRYPTION_KEY**: Es vital generarla y persistirla. Si se pierde, el cliente pierde acceso a sus credenciales guardadas en n8n.
- **Límites de Recursos**: `--cpus` y `--memory` son obligatorios para evitar que un cliente sature el nodo ("Noisy Neighbor").
- **Aislamiento**: Aunque están en la misma red Docker (`traefik_proxy`), n8n no suele escanear. Para mayor seguridad, usar redes separadas por cliente o reglas de firewall interno.
- **Base de Datos**: Para escalar, migrar de SQLite (archivo en disco) a un clúster Postgres centralizado con una DB por cliente.
- **Actualizaciones**:
  - Crear script de update: `docker pull` + `docker stop` + `docker rm` + `docker run` (reusando volumen y ENV vars).
  - Automatizar actualizaciones en ventanas de mantenimiento.
- **Backups**:
  - Script diario que haga `tar` de `/data/n8n/*` y lo suba a S3/Wasabi.

---

## 10. Plan de implementación por fases

### Fase 1 – Infra básica (Proxmox + VMs)
1. Crear VMs `n8n-host-01` y `provisioner-api-01`.
2. Instalar Docker/Compose y Traefik (con wildcard o Let’s Encrypt/Cloudflare).
3. Probar una instancia n8n manual detrás de Traefik.

### Fase 2 – Backend Provisioner
1. Proyecto Node/Nest + Postgres.
2. Modelos (`Client`, `Subscription`, `N8nInstance`).
3. Endpoints base + integración Cloudflare API.
4. SSH al host para ejecutar script de provisión.
5. Prueba: endpoint interno crea instancia end-to-end.

### Fase 3 – Pasarela y Webhooks
1. Configurar plan en Stripe/MP (USD 10/mes).
2. Endpoint de webhook con validación de firma.
3. Enlazar a `provisionN8nInstance` y prueba con pago sandbox.

### Fase 4 – Portal de Clientes
1. Agregar “Planes n8n” (checkout).
2. Agregar “Mis instancias n8n” (lista + abrir).

### Fase 5 – Ciclo de vida + Hardening
1. Suspensión/baja con backup.  
2. Backups de DB y volúmenes `/data/n8n/*`.  
3. Logs, alertas y reintentos.

### Fase 6 – Escala a OVH
1. Sumar nodo al clúster.  
2. Crear `n8n-host-02`.  
3. Provisión multihost (round-robin) y pruebas.

---

## 11. Notas de licencia
n8n es **fair-code**. Para revenderlo como servicio (cada cliente con su instancia) revisá la licencia comercial de n8n y/o consultá al equipo de n8n para cumplir con los términos.
