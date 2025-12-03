# 🎯 Sistema de Gestión de Citas - Integración Completa

## ✅ Características Implementadas

### 1. **Panel de Administración**
- Dashboard con dos pestañas: Servicios y Citas
- Visualización de todas las citas agendadas
- Filtros por estado: Todas, Pendientes, Confirmadas, Canceladas
- Información detallada de cada cita
- Botón para cancelar citas

### 2. **Sincronización con Google Calendar**
- Creación automática de eventos en Google Calendar cuando se agenda
- Almacenamiento del `googleEventId` en la base de datos
- Cancelación automática de eventos cuando el admin cancela la cita
- Notificación al cliente por email sobre cambios

### 3. **Base de Datos**
Campo agregado a `Appointment`:
- `googleEventId` (String, opcional): ID del evento en Google Calendar

### 4. **API Endpoints**

#### GET `/api/appointments` (requiere autenticación)
Obtiene todas las citas para el administrador
```javascript
Headers: { Authorization: 'Bearer {token}' }
Response: [{ id, name, email, phone, date, time, service, status, googleEventId, ... }]
```

#### PATCH `/api/appointments/:id` (requiere autenticación)
Actualiza una cita (status o googleEventId)
```javascript
Headers: { Authorization: 'Bearer {token}' }
Body: { status: 'confirmed', googleEventId: 'abc123' }
Response: { ...appointment }
```

#### DELETE `/api/appointments/:id` (requiere autenticación)
Cancela una cita (cambia status a 'cancelled' y notifica a n8n)
```javascript
Headers: { Authorization: 'Bearer {token}' }
Response: { success: true, appointment: {...}, message: '...' }
```

## 🔄 Flujo Completo

### Agendar Cita:
```
Cliente chat → OpenAI valida disponibilidad → Backend crea en DB (status: pending)
    ↓
Backend envía a n8n webhook (/webhook/agendar-visita)
    ↓
n8n crea evento en Google Calendar
    ↓
n8n responde con { eventId: '...' }
    ↓
Backend guarda googleEventId en DB
    ↓
n8n envía email de confirmación al cliente
```

### Cancelar Cita:
```
Admin cancela desde Dashboard → Backend marca status='cancelled'
    ↓
Backend envía a n8n webhook de cancelación (/webhook/cancelar-visita)
    Payload: { appointmentId, googleEventId, nombre, email, fecha, hora }
    ↓
n8n elimina evento de Google Calendar
    ↓
n8n envía email de cancelación al cliente
    ↓
n8n responde con { success: true }
```

## 📋 Configuración en n8n

### Webhook 1: Agendar Visita
- **Path**: `/webhook/agendar-visita`
- **Método**: POST
- **Respuesta requerida**:
```json
{
  "success": true,
  "message": "Cita agendada en Google Calendar",
  "eventId": "abc123...",
  "appointmentId": 12
}
```

### Webhook 2: Cancelar Visita (NUEVO)
- **Path**: `/webhook/cancelar-visita`
- **Método**: POST
- **Datos recibidos**:
```json
{
  "appointmentId": 12,
  "googleEventId": "abc123...",
  "nombre": "Sofia Ruiz",
  "email": "sofia@test.com",
  "fecha": "2025-12-05",
  "hora": "10:00"
}
```

### Nodos del Workflow de Cancelación:
1. **Webhook Trigger** (cancelar-visita)
2. **Google Calendar - Delete Event** (usar googleEventId del body)
3. **Email Send** (opcional - notificar al cliente)
4. **Respond to Webhook** (responder con success)

## 🔐 Variables de Entorno (.env)

```env
# Existentes
DATABASE_URL=file:./dev.db
AI_API_KEY=sk-...
AI_MODEL=gpt-5-nano
N8N_WEBHOOK_URL=https://n8n.accesoit.com.ar/webhook/agendar-visita
PORT=3002

# NUEVA - Para cancelaciones
N8N_WEBHOOK_CANCEL_URL=https://n8n.accesoit.com.ar/webhook/cancelar-visita
```

## 🎨 UI del Dashboard

### Pestaña "Citas Agendadas":
- **Filtros**: Botones para filtrar por estado
- **Tarjetas de citas** con:
  - Nombre del cliente
  - Badge de estado (Pendiente/Confirmada/Cancelada)
  - Fecha y hora
  - Email y teléfono
  - Servicio solicitado
  - Mensaje adicional
  - Indicador de sincronización con Google Calendar
  - Botón de cancelar (solo para citas no canceladas)

### Confirmación de Cancelación:
- Al hacer click en "Cancelar", muestra confirmación
- Tras cancelar exitosamente, actualiza el estado visual inmediatamente
- Muestra alerta de éxito indicando que se notificó a n8n

## 🧪 Probar la Integración

### 1. Agendar una cita desde el chat:
```
Usuario: "Quiero agendar una visita para mañana a las 10:00. 
         Soy Juan Pérez, email juan@test.com, tel 341-123456, 
         servicio Consultoría"
```

### 2. Verificar en Dashboard:
- Login como admin
- Ir a pestaña "Citas Agendadas"
- Debe aparecer la nueva cita con status "pending"
- Si n8n respondió correctamente, debe mostrar "✓ Sincronizado con Google Calendar"

### 3. Verificar en Google Calendar:
- Abrir el calendario configurado en n8n
- Debe aparecer el evento con:
  - Título: "Consultoría - Juan Pérez"
  - Fecha/Hora correcta
  - Descripción con detalles del cliente
  - Juan invitado (juan@test.com)

### 4. Cancelar la cita:
- Click en botón de cancelar en Dashboard
- Confirmar la acción
- Verificar que:
  - Status cambia a "Cancelada" en Dashboard
  - Evento desaparece de Google Calendar
  - Cliente recibe email de cancelación

## 🛠️ Troubleshooting

### La cita se crea pero no tiene googleEventId:
- Verificar que n8n esté devolviendo el campo `eventId` en la respuesta
- Revisar logs del backend: debe aparecer "Google Event ID guardado: ..."

### No se cancela el evento de Google Calendar:
- Verificar que `N8N_WEBHOOK_CANCEL_URL` esté configurado en .env
- Verificar que el workflow de cancelación esté activo en n8n
- Revisar logs del backend para ver si hubo error al llamar al webhook

### Error de autenticación en Dashboard:
- Verificar que el token JWT esté en localStorage
- Verificar que el endpoint use el middleware `authenticateToken`

## 📝 Próximas Mejoras (Opcionales)

- [ ] Botón para confirmar citas (cambiar status de pending a confirmed)
- [ ] Editar fecha/hora de citas existentes (requiere actualizar Google Calendar)
- [ ] Estadísticas: citas del mes, servicios más solicitados, etc.
- [ ] Exportar citas a CSV/Excel
- [ ] Notificaciones en tiempo real con WebSockets
- [ ] Integración con WhatsApp para recordatorios automáticos
