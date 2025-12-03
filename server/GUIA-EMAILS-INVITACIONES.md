# 📧 Configurar Envío de Correos (Invitaciones)

Para que el sistema envíe correos de confirmación al cliente y a `contacto@accesoit.com.ar`, hemos actualizado el flujo de n8n.

## Pasos para activar

1.  **Abrir n8n** y crear un nuevo workflow (o editar el de creación de citas).
2.  **Importar** el archivo: `server/n8n-workflow-google-calendar-invites.json`.
3.  **Configurar Credenciales**: Reconecta tu cuenta de Google en el nodo "Google Calendar".
4.  **Activar**: Asegúrate de que el switch "Active" esté en verde.
5.  **Verificar URL**: Confirma que la URL del Webhook coincida con `N8N_WEBHOOK_URL` en tu archivo `.env`.

## 🚀 Qué hace este cambio
En el campo "Attendees" (Asistentes) de Google Calendar, ahora ponemos:
`{{ $json.body.email ? $json.body.email + ',' : '' }}contacto@accesoit.com.ar`

Esto significa:
- Si hay email del cliente -> Invita al cliente Y a contacto@accesoit.com.ar
- Si NO hay email del cliente -> Invita SOLO a contacto@accesoit.com.ar

Google Calendar se encargará de enviar los emails de invitación automáticamente.
