// Test final con output a archivo
const http = require('http');
const fs = require('fs');

const postData = JSON.stringify({
  message: 'Hola, soy Sofia Ruiz, email sofia@test.com, tel 341-7777777. Necesito agendar una cita el 2025-12-05 a las 14:00 para Auditoría',
  history: []
});

const options = {
  hostname: '127.0.0.1',
  port: 3002,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 90000
};

let output = '';
output += '\n=== PRUEBA FINAL: Intentar agendar en horario ocupado ===\n';
output += `Fecha solicitada: 2025-12-05\n`;
output += `Hora solicitada: 14:00 (YA OCUPADA)\n\n`;

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      output += '📝 RESPUESTA DE LA IA:\n';
      output += '-'.repeat(60) + '\n';
      output += response.reply + '\n';
      output += '-'.repeat(60) + '\n\n';

      output += '📊 ANÁLISIS:\n';
      if (response.occupied) {
        output += '✅ ÉXITO: El sistema detectó correctamente que el horario está ocupado\n';
        if (response.availableSlots && response.availableSlots.length > 0) {
          output += `✅ Horarios alternativos sugeridos: ${response.availableSlots.join(', ')}\n`;
        }
        output += '\n🎉 La lógica de prevención de conflictos funciona correctamente!\n';
      } else if (response.appointment) {
        output += '❌ FALLO: El sistema agendó la cita a pesar de estar ocupado\n';
        output += `   Cita creada con ID: ${response.appointment.id}\n`;
        output += '\n⚠️  La lógica de prevención NO está funcionando\n';
      } else {
        output += 'ℹ️  La IA respondió pero no intentó agendar\n';
      }

      console.log(output);
      fs.writeFileSync('test-result.txt', output);
      console.log('\n📄 Resultado guardado en test-result.txt');

    } catch (err) {
      output += `❌ Error parseando respuesta: ${err.message}\n`;
      output += `Respuesta raw: ${data}\n`;
      console.log(output);
      fs.writeFileSync('test-result.txt', output);
    }
  });
});

req.on('error', (e) => {
  output += `❌ Error en request: ${e.message}\n`;
  console.log(output);
  fs.writeFileSync('test-result.txt', output);
});

req.on('timeout', () => {
  req.destroy();
  output += '❌ Request timeout después de 90 segundos\n';
  console.log(output);
  fs.writeFileSync('test-result.txt', output);
});

console.log('Enviando request al servidor...');
req.write(postData);
req.end();
