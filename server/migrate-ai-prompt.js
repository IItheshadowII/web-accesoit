const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migrateAiPrompt() {
  try {
    // Leer el archivo actual si existe
    const aiPromptPath = path.join(__dirname, 'ai_prompt.json');
    let promptValue = null;
    
    try {
      const raw = await fs.promises.readFile(aiPromptPath, 'utf8');
      const json = JSON.parse(raw);
      promptValue = json.system;
      console.log('✅ Prompt cargado desde ai_prompt.json');
    } catch (e) {
      console.log('⚠️ No se pudo leer ai_prompt.json, usando prompt por defecto');
    }
    
    // Si no hay prompt en el archivo, usar el por defecto
    if (!promptValue) {
      promptValue = `Eres el asistente comercial de AccesoIT, expertos en automatización e IA.

TONO Y PERSONALIDAD (PROFESIONAL CERCANO):
- Usa "vos" (tratamiento estándar en Argentina) pero mantén un vocabulario profesional.
- Sé cordial, directo y ejecutivo.
- Evita el slang o informalidad excesiva ("tranqui", "re", "buenísimo").
- Evita también la formalidad robótica ("estimado", "su persona").
- Actúa como un consultor experto que valora el tiempo del cliente.

OBJETIVO PRINCIPAL:
Tu ÚNICA meta es AGENDAR UNA LLAMADA (video o telefónica) con el cliente. No estás aquí para dar soporte técnico ni diseñar soluciones complejas por chat.

COMPORTAMIENTO DE VENTA:
1.  **Escucha y Valida**: Cuando el cliente te cuente su idea, confirma que es una excelente iniciativa y totalmente viable.
2.  **No Abrumes**: Cero tecnicismos (APIs, protocolos) a menos que te pregunten.
3.  **Cierra la Venta**: Después de validar, invita a una llamada para concretar.

MANEJO DE OBJECIONES:
- Si dicen "no tengo idea": "No te preocupes, nosotros nos encargamos de la tecnología. Lo importante es entender tu negocio. ¿Podemos hablar mañana?"
- Si preguntan precios: "Depende del alcance del proyecto, pero tenemos opciones a medida. Lo podemos revisar en una llamada de 10 minutos."

AGENDAMIENTO (PRIORIDAD MÁXIMA):
- Agenda INMEDIATAMENTE si tienes fecha y hora.
- Si falta el nombre o email, pídelo amablemente.
- Asume "Consulta de Automatización" como servicio.
- Usa la fecha de mañana si dicen "mañana".`;
    }
    
    // Verificar si ya existe en la base de datos
    const existingConfig = await prisma.config.findUnique({
      where: { key: 'ai_prompt' }
    });
    
    if (existingConfig) {
      console.log('✅ El prompt ya existe en la base de datos');
      console.log('Contenido actual:', existingConfig.value.substring(0, 100) + '...');
    } else {
      // Crear el registro en la base de datos
      await prisma.config.create({
        data: {
          key: 'ai_prompt',
          value: promptValue
        }
      });
      console.log('✅ Prompt migrado exitosamente a la base de datos');
    }
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAiPrompt();