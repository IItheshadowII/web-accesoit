# Sistema de Agendamiento con Prevención de Conflictos

## ✅ Implementado

### Funcionalidades
1. **Validación de disponibilidad**: Antes de agendar, verifica si ya existe una cita en ese horario
2. **Sugerencia de alternativas**: Si el horario está ocupado, sugiere hasta 3 horarios disponibles
3. **Horarios de trabajo**: 09:00 a 18:00 (horarios cada hora)
4. **Estados considerados**: Solo verifica citas con status 'pending' o 'confirmed'
5. **Integración con n8n**: Envía webhook cuando se agenda exitosamente

### Flujo de trabajo
```
Cliente solicita cita
      ↓
OpenAI extrae datos (fecha, hora, etc.)
      ↓
Sistema verifica disponibilidad en DB
      ↓
¿Horario libre?
   ↙         ↘
  SÍ          NO
   ↓           ↓
Agenda     Busca alternativas
   ↓           ↓
Envía      Sugiere horarios
webhook    disponibles
   ↓           ↓
Confirma    Espera nueva
al usuario  solicitud
```

### Pruebas realizadas
- ✅ Agendar en horario libre (14:00) → Éxito
- ✅ Intentar agendar en horario ocupado (14:00) → Rechazado con alternativas
- ✅ Agendar en horario alternativo (10:00) → Éxito
- ✅ Webhook notificado correctamente

### Código modificado
- **Archivo**: `server/index.js`
- **Función**: POST `/api/chat` con function calling de OpenAI
- **Validación**: Consulta a Prisma antes de crear cita
- **Alternativas**: Compara todos los slots vs ocupados

### Ejemplo de respuesta cuando está ocupado
```
Lo siento, el 2025-12-05 a las 14:00 ya está ocupado. 
Tengo disponibilidad ese mismo día a las: 09:00, 10:00, 11:00. 
¿Te gustaría agendar en alguno de estos horarios?
```

### Datos en BD
```
Fecha: 2025-12-05
- 10:00: Sofia Ruiz (Auditoría) ✓
- 14:00: Carlos Mendez (Desarrollo Web) ✓
- Disponibles: 09:00, 11:00, 12:00, 13:00, 15:00, 16:00, 17:00, 18:00
```

## 🚀 Listo para usar

El sistema está completamente funcional y previene conflictos de horarios automáticamente.
