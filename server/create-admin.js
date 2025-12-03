const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function createAdminUser() {
    try {
        console.log('Creating admin user...');
        
        // Hash the password
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const user = await prisma.user.create({
            data: {
                email: 'admin@accesoit.com',
                password: hashedPassword,
                name: 'Admin User',
                role: 'admin',
                disabled: false
            },
            select: { id: true, email: true, name: true, role: true, disabled: true }
        });
        
        console.log('Admin user created successfully:');
        console.log('- ID:', user.id);
        console.log('- Email:', user.email);
        console.log('- Name:', user.name);
        console.log('- Role:', user.role);
        console.log('- Disabled:', user.disabled);
        console.log('\nLogin credentials:');
        console.log('- Email: admin@accesoit.com');
        console.log('- Password: admin123');
        
    } catch (error) {
        if (error.code === 'P2002') {
            console.log('Admin user already exists, updating...');
            
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            const user = await prisma.user.update({
                where: { email: 'admin@accesoit.com' },
                data: { 
                    password: hashedPassword,
                    disabled: false,
                    role: 'admin'
                },
                select: { id: true, email: true, name: true, role: true, disabled: true }
            });
            
            console.log('Admin user updated:');
            console.log('- ID:', user.id);
            console.log('- Email:', user.email);
            console.log('- Name:', user.name);
            console.log('- Role:', user.role);
            console.log('- Disabled:', user.disabled);
        } else {
            console.error('Error creating admin user:', error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

createAdminUser();