const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkUser() {
    try {
        console.log('Checking admin user status...');
        
        const user = await prisma.user.findUnique({
            where: { email: 'admin@accesoit.com' }
        });
        
        if (user) {
            console.log('User found:');
            console.log('- ID:', user.id);
            console.log('- Email:', user.email);
            console.log('- Name:', user.name);
            console.log('- Role:', user.role);
            console.log('- Disabled:', user.disabled);
            console.log('- Created:', user.createdAt);
        } else {
            console.log('User not found!');
            
            // List all users to see what's available
            const allUsers = await prisma.user.findMany({
                select: { id: true, email: true, name: true, role: true, disabled: true }
            });
            console.log('\nAll users in database:');
            allUsers.forEach(u => {
                console.log(`- ${u.email} (${u.role}) - Disabled: ${u.disabled}`);
            });
        }
        
    } catch (error) {
        console.error('Error checking user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUser();