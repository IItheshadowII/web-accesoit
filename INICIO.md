# 🚀 Scripts de Inicio - Backend y Frontend

Este proyecto incluye varios métodos para iniciar el backend y frontend simultáneamente.

## 📋 Opciones Disponibles

### Opción 1: Script NPM (Recomendado) ⭐

La forma más sencilla y multiplataforma:

```bash
npm run dev:all
```

Este comando iniciará:
- **Backend** en el puerto configurado (por defecto 3000)
- **Frontend** en el puerto 5173

### Opción 2: Script PowerShell

Para usuarios de Windows que prefieren PowerShell:

```powershell
.\start.ps1
```

**Características:**
- Logs en tiempo real con colores
- Manejo de errores
- Detención limpia con Ctrl+C

### Opción 3: Script Batch

Para usuarios de Windows que prefieren CMD:

```cmd
start.bat
```

**Características:**
- Instalación automática de dependencias si es necesario
- Logs con colores diferenciados por servicio

## 🛠️ Inicio Manual

Si prefieres iniciar los servicios por separado:

### Backend
```bash
cd server
npm run dev
```

### Frontend
```bash
npm run dev
```

## 📝 Notas

- Asegúrate de tener las dependencias instaladas antes de ejecutar los scripts:
  ```bash
  npm install
  cd server && npm install
  ```

- Los scripts utilizan `concurrently` para gestionar múltiples procesos. Esta dependencia se instala automáticamente.

- Para detener los servicios, presiona `Ctrl+C` en la terminal.

## 🔧 Configuración

Verifica que los archivos `.env` estén configurados correctamente:
- `.env` en la raíz (Frontend)
- `server/.env` (Backend)

## 🌐 URLs por Defecto

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000 (o el puerto configurado en `server/.env`)

---

**¿Problemas?** Verifica que:
1. Node.js esté instalado (v16 o superior)
2. Las dependencias estén instaladas
3. Los puertos no estén en uso por otras aplicaciones
