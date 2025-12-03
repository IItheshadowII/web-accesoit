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
            role: 'admin',
            services: {
                create: [
                    { name: 'Bot WhatsApp Ventas', status: 'Active', description: 'Bot activo respondiendo consultas.' },
                    { name: 'Servidor VPS', status: 'Active', description: 'Uptime 99.9%.' },
                    { name: 'Backup Diario', status: 'Pending', description: 'Pendiente de configuración.' },
                ],
            },
        },
    });

    // Crear plan básico de n8n
    const basicPlan = await prisma.plan.upsert({
        where: { name: 'Básico n8n' },
        update: {},
        create: {
            name: 'Básico n8n',
            description: 'Plan básico de automatización con n8n',
            priceMonthly: 10.0,
            features: JSON.stringify({
                workflows: 10,
                executions: 1000,
                cpu: '0.5',
                memory: '1GB',
                support: 'Email'
            }),
            active: true
        }
    });

    console.log({ user, basicPlan });
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
