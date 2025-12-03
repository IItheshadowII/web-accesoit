// Test: Agendar en horario disponible
const http = require('http');
const fs = require('fs');

const postData = JSON.stringify({
  message: 'Perfecto, entonces agendo para las 10:00. Soy Sofia Ruiz, email sofia@test.com, tel 341-7777777, fecha 2025-12-05, hora 10:00, servicio Auditoría',
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
output += '\n=== PRUEBA: Agendar en horario DISPONIBLE (10:00) ===\n\n';

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
      if (response.appointment) {
        output += '✅ ÉXITO: La cita fue agendada correctamente\n';
        output += `   ID: ${response.appointment.id}\n`;
        output += `   Fecha: ${response.appointment.date}\n`;
        output += `   Hora: ${response.appointment.time}\n`;
        output += `   Cliente: ${response.appointment.name}\n`;
        output += '\n🎉 El sistema permite agendar en horarios libres!\n';
      } else if (response.occupied) {
        output += '❌ FALLO: El sistema indica que está ocupado (debería estar libre)\n';
      } else {
        output += 'ℹ️  Respuesta sin agendamiento\n';
      }

      console.log(output);
      fs.writeFileSync('test-available.txt', output);
      console.log('\n📄 Resultado guardado en test-available.txt');

    } catch (err) {
      output += `❌ Error: ${err.message}\n`;
      console.log(output);
      fs.writeFileSync('test-available.txt', output);
    }
  });
});

req.on('error', (e) => {
  output += `❌ Error en request: ${e.message}\n`;
  console.log(output);
  fs.writeFileSync('test-available.txt', output);
});

req.on('timeout', () => {
  req.destroy();
  output += '❌ Timeout\n';
  console.log(output);
  fs.writeFileSync('test-available.txt', output);
});

console.log('Enviando request para horario disponible...');
req.write(postData);
req.end();
