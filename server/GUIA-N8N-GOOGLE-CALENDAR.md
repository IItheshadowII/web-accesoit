# Guía de Integración con Google Calendar en n8n

## 📋 Pasos de Configuración

### 1. **Importar el Workflow**
1. Abre n8n: `https://n8n.accesoit.com.ar`
2. Click en "+" → "Import from File"
3. Selecciona el archivo `n8n-workflow-google-calendar.json`

### 2. **Configurar Google Calendar Credentials**

#### Opción A: OAuth2 (Recomendado)
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto o selecciona uno existente
3. Habilita la API de Google Calendar:
   - APIs & Services → Enable APIs and Services
   - Busca "Google Calendar API" → Enable
4. Crear credenciales OAuth:
   - Credentials → Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://n8n.accesoit.com.ar/rest/oauth2-credential/callback`
5. Copia el Client ID y Client Secret
6. En n8n:
   - Credentials → Add Credential → Google Calendar OAuth2 API
   - Pega Client ID y Client Secret
   - Click "Connect my account"
   - Autoriza el acceso

#### Opción B: Service Account (Para automatización completa)
1. En Google Cloud Console:
   - IAM & Admin → Service Accounts → Create Service Account
   - Descarga el archivo JSON de credenciales
2. Comparte tu Google Calendar con el email del service account
3. En n8n:
   - Credentials → Google Calendar Service Account
   - Pega el contenido del JSON

### 3. **Configurar SMTP para Emails** (Opcional)

Si quieres enviar emails de confirmación:

#### Gmail SMTP:
```
Host: smtp.gmail.com
Port: 587
User: tu-email@gmail.com
Password: [Contraseña de aplicación]
Security: TLS
```

**Nota**: Debes generar una "App Password" en tu cuenta de Google:
1. Ve a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Genera una contraseña para "Mail"
3. Usa esa contraseña en n8n

### 4. **Verificar el Webhook**

El webhook ya está configurado en tu backend:
```javascript
N8N_WEBHOOK_URL=https://n8n.accesoit.com.ar/webhook/agendar-visita
```

Asegúrate de que en n8n el webhook tenga el mismo path: `agendar-visita`

### 5. **Personalizar el Calendario**

En el nodo "Crear Evento en Google Calendar", puedes modificar:

```javascript
// Duración por defecto: 1 hora
// Puedes cambiarla según el tipo de servicio:
{
  "start": "{{ $json.fecha }}T{{ $json.hora }}:00",
  "end": "{{ $json.fecha }}T{{ add_hours($json.hora, 1) }}:00"
}

// Timezone
"timeZone": "America/Argentina/Buenos_Aires"

// Ubicación
"location": "AccesoIT - Oficina Central"

// Añadir recordatorios
"reminders": {
  "useDefault": false,
  "overrides": [
    { "method": "email", "minutes": 1440 },  // 24 horas antes
    { "method": "popup", "minutes": 30 }      // 30 minutos antes
  ]
}
```

## 🔄 Flujo Completo

```
Usuario solicita cita en WhatsApp
         ↓
OpenAI extrae datos + Valida disponibilidad
         ↓
Backend guarda en Prisma DB
         ↓
Backend envía POST a n8n webhook
         ↓
n8n recibe datos de la cita
         ↓
n8n crea evento en Google Calendar
         ↓
n8n envía email de confirmación (opcional)
         ↓
Usuario recibe invitación en su email
```

## 📊 Datos que Recibe n8n

```json
{
  "appointmentId": 12,
  "nombre": "Sofia Ruiz",
  "email": "sofia@test.com",
  "phone": "341-7777777",
  "fecha": "2025-12-05",
  "hora": "10:00",
  "service": "Auditoría",
  "message": "Mensaje opcional del cliente"
}
```

## ✨ Mejoras Opcionales

### 1. **Diferentes duraciones según servicio**
```javascript
// En el nodo Google Calendar
const duraciones = {
  'Consultoría': 2,      // 2 horas
  'Desarrollo Web': 1.5, // 1.5 horas
  'Auditoría': 3,        // 3 horas
  'Mantenimiento': 1     // 1 hora
};
const duracion = duraciones[$json.service] || 1;
```

### 2. **Enviar recordatorio por WhatsApp**
Agrega un nodo de WhatsApp Business API después del calendario:
- 24 horas antes
- 1 hora antes

### 3. **Sincronizar con múltiples calendarios**
Si tienes diferentes técnicos, puedes:
- Tener un calendario por técnico
- Usar el campo "service" para determinar a qué calendario asignar

### 4. **Actualizar estado en la BD**
Agrega un nodo HTTP Request para actualizar el status en Prisma:
```javascript
POST http://localhost:3002/api/appointments/{appointmentId}
{
  "status": "confirmed",
  "googleEventId": "{{ $json.id }}"
}
```

## 🧪 Probar el Workflow

Desde el backend:
```bash
cd C:\Users\Kratos\Desktop\web-accesoit\server
node test-available.js
```

Verifica:
- ✅ Evento aparece en Google Calendar
- ✅ Cliente recibe email con invitación
- ✅ n8n responde con status 200

## 🐛 Solución de Problemas

### Error: "Insufficient permission"
- Verifica que hayas autorizado los scopes correctos en OAuth
- Scope necesario: `https://www.googleapis.com/auth/calendar`

### Error: "Calendar not found"
- Asegúrate de usar "primary" o el ID correcto del calendario
- En Service Account: comparte el calendario con el email del service account

### No recibe el webhook
- Verifica que el workflow esté activado en n8n
- Revisa los logs del backend: `console.log` del webhook
- Prueba el webhook manualmente con Postman/curl

## 📝 Notas Importantes

1. **Zona horaria**: Configurada para Argentina (GMT-3)
2. **Formato de fecha**: Backend envía `YYYY-MM-DD`
3. **Formato de hora**: Backend envía `HH:MM` (24 horas)
4. **Duración**: Por defecto 1 hora, personalizable
5. **Invitados**: Se añade automáticamente el email del cliente
