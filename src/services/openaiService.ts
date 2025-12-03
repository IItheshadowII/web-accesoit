import { openai } from '../config/openai';
import { ChatMessage, Visit } from '../types/visit';
import { createVisitWebhook } from './visitService';

// Schema for the OpenAI function
const crearVisitaFunction = {
  name: 'crear_visita',
  description: 'Crea una visita/turno en la agenda',
  parameters: {
    type: 'object',
    properties: {
      nombre: { type: 'string', description: "Nombre del cliente" },
      telefono: { type: 'string', description: 'Teléfono del cliente (opcional)' },
      fecha: { type: 'string', description: 'Fecha preferida en formato YYYY-MM-DD' },
      hora: { type: 'string', description: 'Hora preferida en formato HH:MM' },
      motivo: { type: 'string', description: 'Motivo de la visita (opcional)' }
    },
    required: ['nombre', 'fecha', 'hora']
  }
};

export async function processChat(messages: ChatMessage[]): Promise<string> {
  // Convert to the shape OpenAI SDK expects (role/content)
  const msgs = messages.map(m => ({ role: m.role, content: m.content }));

  // First call to OpenAI allowing function calling
  console.log('[OpenAI Service] Sending chat completion request to OpenAI with', msgs.length, 'messages');
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: msgs,
    functions: [crearVisitaFunction as any],
    function_call: 'auto'
  });

  const message = completion.choices?.[0]?.message;

  if (!message) {
    throw new Error('No response from OpenAI');
  }

  // If OpenAI decided to call the function
  if ((message as any).function_call) {
    const fnCall = (message as any).function_call;
    console.log('[OpenAI Service] OpenAI requested function call:', fnCall.name);
    if (fnCall.name === 'crear_visita') {
      // Parse arguments
      let args: Partial<Visit> = {};
      try {
        args = JSON.parse(fnCall.arguments);
      } catch (err) {
        // If parsing fails, ask OpenAI to reformat
        console.error('[OpenAI Service] Failed to parse function_call.arguments', err);
        const followUp = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            ...msgs,
            { role: 'assistant', content: 'He recibido una llamada a crear_visita pero los argumentos no son JSON válido.' }
          ]
        });
        return followUp.choices?.[0]?.message?.content || 'Error procesando la solicitud';
      }

      // Validate required fields
      if (!args.nombre || !args.fecha || !args.hora) {
        // Ask OpenAI to ask the user for missing fields
        const missing = [] as string[];
        if (!args.nombre) missing.push('nombre');
        if (!args.fecha) missing.push('fecha');
        if (!args.hora) missing.push('hora');

        const prompt = `Faltan los siguientes campos requeridos para agendar la visita: ${missing.join(', ')}. Por favor solicítalos al usuario.`;

        const followUp = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            ...msgs,
            { role: 'assistant', content: prompt }
          ]
        });

        return followUp.choices?.[0]?.message?.content || `Faltan campos: ${missing.join(', ')}`;
      }

      // Build Visit object
      const visit: Visit = {
        nombre: String(args.nombre),
        telefono: args.telefono ? String(args.telefono) : undefined,
        fecha: String(args.fecha),
        hora: String(args.hora),
        motivo: args.motivo ? String(args.motivo) : undefined
      };

      // Call internal visit creation (n8n webhook)
      try {
        console.log('[OpenAI Service] Calling createVisitWebhook with', visit);
        const result = await createVisitWebhook(visit);
        console.log('[OpenAI Service] Webhook result:', result);

        // After creating, call OpenAI again to produce a natural language reply
        const assistantMessages = [
          ...msgs,
          { role: 'assistant', content: message.content || '' },
          { role: 'function', name: 'crear_visita', content: JSON.stringify(result) }
        ];

        console.log('[OpenAI Service] Sending follow-up to OpenAI to generate user-facing reply');
        const final = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: assistantMessages
        });

        const finalMsg = final.choices?.[0]?.message?.content;
        console.log('[OpenAI Service] Final message:', finalMsg);
        return finalMsg || 'Visita creada correctamente.';
      } catch (err: any) {
        console.error('[OpenAI Service] Error creating visit via webhook:', err?.message || err);
        // Inform user of failure
        const followUp = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            ...msgs,
            { role: 'assistant', content: 'Intenté crear la visita pero hubo un error al comunicarse con el sistema de reservas.' }
          ]
        });
        return followUp.choices?.[0]?.message?.content || 'Error al crear la visita.';
      }
    }
  }

  // If no function call, return assistant content
  return message.content || '';
}
