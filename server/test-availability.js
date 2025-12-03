// Script para probar la lógica de disponibilidad
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAvailability() {
  console.log('\n=== CONSULTANDO CITAS EXISTENTES ===');
  
  // Ver todas las citas del 2025-12-05
  const appointments = await prisma.appointment.findMany({
    where: {
      date: '2025-12-05',
      status: {
        in: ['pending', 'confirmed']
      }
    },
    orderBy: {
      time: 'asc'
    }
  });

  console.log(`\nCitas encontradas para 2025-12-05: ${appointments.length}`);
  appointments.forEach(apt => {
    console.log(`  - ${apt.time}: ${apt.name} (${apt.service}) [ID: ${apt.id}]`);
  });

  // Probar disponibilidad para 14:00
  console.log('\n=== VERIFICANDO DISPONIBILIDAD 14:00 ===');
  const existingAt14 = await prisma.appointment.findFirst({
    where: {
      date: '2025-12-05',
      time: '14:00',
      status: {
        in: ['pending', 'confirmed']
      }
    }
  });

  if (existingAt14) {
    console.log('❌ 14:00 está OCUPADO');
    
    // Buscar horarios alternativos
    const allSlots = [
      '09:00', '10:00', '11:00', '12:00',
      '13:00', '14:00', '15:00', '16:00',
      '17:00', '18:00'
    ];
    
    const occupiedTimes = appointments.map(apt => apt.time);
    const availableSlots = allSlots.filter(slot => !occupiedTimes.includes(slot));
    
    console.log(`✅ Horarios disponibles: ${availableSlots.join(', ')}`);
  } else {
    console.log('✅ 14:00 está DISPONIBLE');
  }

  await prisma.$disconnect();
}

testAvailability().catch(console.error);
