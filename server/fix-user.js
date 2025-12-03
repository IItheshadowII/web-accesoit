const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function fixUser() {
    try {
        console.log('Fixing admin user disabled status...');
        
        const user = await prisma.user.update({
            where: { email: 'admin@accesoit.com' },
            data: { disabled: false },
            select: { id: true, email: true, name: true, role: true, disabled: true }
        });
        
        console.log('User updated:');
        console.log('- ID:', user.id);
        console.log('- Email:', user.email);
        console.log('- Name:', user.name);
        console.log('- Role:', user.role);
        console.log('- Disabled:', user.disabled);
        
        console.log('\nUser should now be able to login!');
        
    } catch (error) {
        console.error('Error fixing user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixUser();