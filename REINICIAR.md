# ⚠️ IMPORTANTE: Reiniciar los Servicios

## 🔧 Problema Solucionado

Se ha creado el archivo `.env` con la configuración correcta del backend:
```
VITE_API_URL=http://localhost:3002
```

## 🔄 Acción Requerida

**Vite necesita reiniciarse para leer las nuevas variables de entorno.**

### Pasos:

1. **Detén los procesos actuales** presionando `Ctrl+C` en las terminales donde están corriendo los servicios

2. **Reinicia los servicios** con cualquiera de estos comandos:
   ```bash
   npm run dev:all
   ```
   O:
   ```cmd
   start.bat
   ```
   O:
   ```powershell
   .\start.ps1
   ```

3. **Recarga la página** en el navegador (F5 o Ctrl+R)

4. **Intenta hacer login nuevamente** con:
   - Email: `admin@accesoit.com`
   - Contraseña: (la que tengas configurada)

## ✅ Verificación

Después de reiniciar, deberías ver en los logs del backend:
```
Environment: { AI_ENABLED: true, N8N_WEBHOOK_URL: 'configured', PORT: '3002' }
Server running on port 3002
```

Y el frontend debería conectarse correctamente a `http://localhost:3002/api/auth/login`

---

**Nota**: Las variables de entorno en Vite solo se cargan al iniciar el servidor de desarrollo, por eso es necesario reiniciar.
