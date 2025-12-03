const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany();
    
    console.log('\n=== USUARIOS EN LA BASE DE DATOS ===\n');
    
    if (users.length === 0) {
      console.log('❌ No hay usuarios registrados.');
      console.log('\n💡 Necesitas crear un usuario administrador.');
      console.log('   Puedes usar el seed script o crear uno manualmente.\n');
    } else {
      users.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`Nombre: ${user.name}`);
        console.log(`Email: ${user.email}`);
        console.log(`Empresa: ${user.company || 'N/A'}`);
        console.log(`Creado: ${new Date(user.createdAt).toLocaleString('es-AR')}`);
        console.log('---\n');
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
