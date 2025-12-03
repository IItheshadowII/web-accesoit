const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateAdminRole() {
  try {
    const adminUser = await prisma.user.update({
      where: { email: 'admin@accesoit.com' },
      data: { role: 'admin' }
    });
    
    console.log('Usuario admin actualizado:', adminUser);
    
    // Verificar todos los usuarios
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
    
    console.log('\n=== TODOS LOS USUARIOS ===');
    users.forEach(user => {
      console.log(`${user.email} - Rol: ${user.role}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminRole();