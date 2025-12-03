// Test simple y directo
const http = require('http');

const postData = JSON.stringify({
  message: 'Hola, soy Laura Martinez, email laura@test.com, tel 341-6666666. Quiero agendar una visita el 2025-12-05 a las 14:00 para Mantenimiento',
  history: []
});

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 60000
};

console.log('\n=== PRUEBA: Agendar en horario ocupado (14:00) ===\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      console.log('📝 Respuesta de la IA:');
      console.log(response.reply);
      console.log('');

      if (response.occupied) {
        console.log('✅ CORRECTO: Sistema detectó que el horario está ocupado');
        if (response.availableSlots && response.availableSlots.length > 0) {
          console.log('📅 Horarios alternativos sugeridos:', response.availableSlots.join(', '));
        }
      } else if (response.appointment) {
        console.log('❌ ERROR: No debería haber agendado - el horario está ocupado!');
        console.log('Cita creada con ID:', response.appointment.id);
      } else {
        console.log('ℹ️  Respuesta normal de chat (no intentó agendar)');
      }

    } catch (err) {
      console.error('Error parseando respuesta:', err.message);
      console.log('Respuesta raw:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error en request:', e.message);
});

req.on('timeout', () => {
  req.destroy();
  console.error('Request timeout después de 60 segundos');
});

req.write(postData);
req.end();
