const { provisionN8nInstance } = require('./services/n8nProvisioner');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // Buscar un usuario existente o crear uno de prueba
        let user = await prisma.user.findFirst();
        if (!user) {
            console.log('No users found, creating test user...');
            user = await prisma.user.create({
                data: {
                    email: 'test@accesoit.com',
                    password: 'hashedpassword',
                    name: 'Test User'
                }
            });
        }

        console.log(`Testing provision for user: ${user.email} (ID: ${user.id})`);

        // Ejecutar provisión (mocked SSH)
        const instance = await provisionN8nInstance(user.id);

        console.log('Provisioning result:', instance);
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
