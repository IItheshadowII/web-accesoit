// Script para probar el flujo completo con respuestas
// Usando fetch global de Node.js 18+

async function testFlow() {
  console.log('\n=== PRUEBA 2: Intentar agendar en horario ocupado (14:00) ===\n');
  
  const body = {
    message: 'Hola, necesito agendar una cita. Soy Maria Lopez, email maria@test.com, teléfono 341-9999999, fecha 2025-12-05, hora 14:00, servicio Consultoría',
    history: []
  };

  try {
    const response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    console.log('📝 Respuesta de la IA:');
    console.log(data.reply);
    console.log('\n');

    if (data.occupied) {
      console.log('✅ Sistema detectó horario ocupado correctamente');
      console.log('📅 Horarios alternativos sugeridos:', data.availableSlots?.join(', ') || 'ninguno');
    } else if (data.appointment) {
      console.log('❌ ERROR: No debería haber agendado - el horario está ocupado');
      console.log('Cita ID:', data.appointment.id);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFlow();
