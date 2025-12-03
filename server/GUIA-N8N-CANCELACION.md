# 🗑️ Configuración de Cancelación de Citas con n8n

Para que la **reprogramación** funcione correctamente (borrando la cita vieja y creando la nueva), necesitas configurar este flujo.

## 1. Importar el Workflow en n8n

1. Abre tu panel de n8n.
2. Crea un nuevo workflow.
3. Ve al menú (tres puntos arriba a la derecha) > **Import from File**.
4. Selecciona el archivo `server/n8n-workflow-cancel-appointment.json` que acabo de crear.

## 2. Configurar Credenciales

1. Haz doble clic en el nodo **Google Calendar**.
2. En "Credential for Google Calendar", selecciona tu cuenta conectada.
3. Cierra y guarda el workflow.

## 3. Activar y Obtener URL

1. Haz clic en **Activate** (switch arriba a la derecha) para ponerlo en producción.
2. Haz clic en el nodo **Webhook**.
3. Selecciona **Production URL**.
4. Copia la URL que aparece (ej: `https://tu-n8n.com/webhook/cancel-appointment`).

## 4. Configurar el Servidor

1. Abre el archivo `server/.env`.
2. Agrega o actualiza la variable `N8N_WEBHOOK_CANCEL_URL` con la URL que copiaste:

```env
N8N_WEBHOOK_CANCEL_URL=https://tu-n8n.com/webhook/cancel-appointment
```

3. **Reinicia el servidor** (`npm run dev:all`) para que tome los cambios.

---

## 🧪 Cómo probarlo

1. Agenda una cita en el chat: *"Agenda una reunión para mañana a las 10"*.
2. Verifica que aparezca en tu Google Calendar.
3. Pide reprogramarla: *"Cámbiala para el viernes a las 15"*.
4. **Resultado esperado**:
   - La cita de mañana a las 10 **desaparece** del calendario.
   - Aparece la nueva cita el viernes a las 15.
