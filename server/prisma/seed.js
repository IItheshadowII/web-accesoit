const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const user = await prisma.user.upsert({
        where: { email: 'admin@accesoit.com' },
        update: {},
        create: {
            email: 'admin@accesoit.com',
            name: 'Admin User',
            company: 'AccesoIT Internal',
            password: hashedPassword,
            services: {
                create: [
                    { name: 'Bot WhatsApp Ventas', status: 'Active', description: 'Bot activo respondiendo consultas.' },
                    { name: 'Servidor VPS', status: 'Active', description: 'Uptime 99.9%.' },
                    { name: 'Backup Diario', status: 'Pending', description: 'Pendiente de configuración.' },
                ],
            },
        },
    });

    console.log({ user });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
