# 📅 Evitar Solapamientos con Google Calendar

Para que el sistema verifique tu calendario real antes de agendar (y evite solapamientos con citas que no están en la base de datos), sigue estos pasos:

## 1. Importar el Workflow de Verificación

1. En n8n, importa el archivo `server/n8n-workflow-check-availability.json`.
2. Configura las credenciales de Google Calendar en el nodo correspondiente.
3. Activa el workflow.
4. Obtén la URL de producción del Webhook.

## 2. Configurar el Servidor

Agrega la siguiente variable a tu archivo `server/.env`:

```env
N8N_WEBHOOK_CHECK_AVAILABILITY_URL=https://tu-n8n.com/webhook/check-availability
```

## 3. Reiniciar

Reinicia el servidor (`npm run dev:all`) para aplicar los cambios.

---

## 🔄 Cómo funciona ahora

1. El usuario pide una cita (ej: "mañana a las 15").
2. El sistema verifica si hay cita en la base de datos local.
3. **NUEVO**: Si está libre localmente, consulta a n8n (`check-availability`).
4. n8n mira tu Google Calendar real.
5. Si n8n dice "ocupado", el sistema le responde al usuario: *"Lo siento, ese horario ya está ocupado..."* y sugiere alternativas.
