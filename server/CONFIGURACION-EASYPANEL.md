# Configuración de Easypanel para Provisioning de n8n

## Estado Actual

El sistema está funcionando en **MODO MOCK** (simulación). Las instancias n8n se crean en la base de datos pero NO se crean contenedores reales en Easypanel.

## Para Activar Provisioning Real

### 1. Verificar la API de Easypanel

Primero necesitas verificar cuál es el endpoint correcto de la API de Easypanel. El error actual indica que `/api/services` no existe.

**Opciones para investigar:**

#### Opción A: Revisar documentación interna de Easypanel
1. Accede a tu panel de Easypanel en el navegador
2. Ve a Settings → API
3. Verifica si hay documentación de endpoints disponibles

#### Opción B: Inspeccionar llamadas desde el UI
1. Abre Easypanel en el navegador
2. Abre DevTools (F12) → pestaña Network
3. Crea un servicio manualmente desde el UI
4. Observa qué endpoint se usa (probablemente algo como `/trpc/...`)

#### Opción C: Revisar código fuente
Easypanel es open source. Puedes revisar:
```bash
git clone https://github.com/easypanel-io/easypanel
cd easypanel
grep -r "createService" --include="*.ts"
```

### 2. Actualizar easypanelClient.js

Una vez que sepas el endpoint correcto, actualiza el archivo:
`server/services/easypanelClient.js`

Busca la función `createN8nService` y actualiza la URL:

```javascript
// Ejemplo si usa tRPC:
const response = await fetch(`${EASYPANEL_URL}/trpc/service.create`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${EASYPANEL_API_KEY}`
  },
  body: JSON.stringify({
    // Formato correcto según la API real
  })
});
```

### 3. Configurar Variables de Entorno en Easypanel

Ve a tu servicio `web-accesoit` en Easypanel → Settings → Environment Variables:

```env
# URL interna de Easypanel (usar nombre del servicio en la red Docker)
EASYPANEL_URL=http://easypanel:3000

# API Key (obtener desde Easypanel → Settings → API Keys)
EASYPANEL_API_KEY=tu_api_key_aqui

# ID del proyecto donde se crearán los servicios n8n
EASYPANEL_PROJECT_ID=n8n

# Desactivar modo MOCK
MOCK_EASYPANEL=false
```

### 4. Reiniciar el Servicio

Después de agregar las variables de entorno, Easypanel reiniciará automáticamente el servicio.

En los logs verás:
```
[Easypanel Client] Configuration: {
  url: 'http://easypanel:3000',
  hasApiKey: true,
  projectId: 'n8n',
  mockMode: false
}
```

## Verificación de Modo MOCK

El sistema está en modo MOCK si:
- ❌ No hay `EASYPANEL_API_KEY` configurada
- ✅ `MOCK_EASYPANEL=true` explícitamente

En modo MOCK verás en logs:
```
[Easypanel] MOCK MODE - Simulating service creation
```

## Troubleshooting

### Error: ECONNREFUSED
- **Causa**: URL incorrecta o servicio no accesible
- **Solución**: Verifica que `EASYPANEL_URL` use el nombre correcto del servicio en la red Docker
- Ejecuta desde dentro del contenedor: `curl http://easypanel:3000/api/health`

### Error: Route POST:/api/services not found
- **Causa**: Endpoint de API incorrecto
- **Solución**: Investiga el endpoint correcto según las opciones arriba

### Error: Unauthorized
- **Causa**: API key inválida o expirada
- **Solución**: Genera nueva API key en Easypanel Settings

### Instancias en DB pero no en Docker
- **Causa**: Sistema en modo MOCK
- **Solución**: Configura API key y variables de entorno

## Alternativa: Mantener Modo MOCK

Si prefieres usar modo MOCK (para desarrollo o testing):

1. **NO** agregues `EASYPANEL_API_KEY`
2. Las instancias se crearán solo en la base de datos
3. Puedes simular el flujo completo de UI sin crear contenedores reales
4. Útil para probar la lógica de suscripciones, pagos, etc.

## Próximos Pasos

Una vez que el provisioning real funcione:

1. ✅ Configurar DNS wildcard `*.n8n.accesoit.com.ar` apuntando a tu servidor
2. ✅ Configurar Traefik para enrutar subdominios a contenedores n8n
3. ✅ Implementar envío de emails con credenciales
4. ✅ Integrar webhooks de pago reales (Stripe/MercadoPago)
5. ✅ Implementar lógica de suspensión por falta de pago
