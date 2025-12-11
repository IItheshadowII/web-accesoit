/**
 * Script de diagnóstico para verificar usuarios en la BD
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function diagnose() {
    console.log('🔍 DIAGNÓSTICO DEL SISTEMA\n');

    try {
        // 1. Verificar conexión a BD
        console.log('1️⃣  Verificando conexión a base de datos...');
        await prisma.$connect();
        console.log('✅ Conexión exitosa\n');

        // 2. Contar usuarios
        console.log('2️⃣  Contando usuarios...');
        const userCount = await prisma.user.count();
        console.log(`✅ Total de usuarios: ${userCount}\n`);

        // 3. Listar todos los usuarios
        console.log('3️⃣  Listando usuarios:');
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                disabled: true,
                password: true, // Para verificar que existe
                createdAt: true
            }
        });

        if (users.length === 0) {
            console.log('⚠️  NO HAY USUARIOS EN LA BASE DE DATOS');
            console.log('   Ejecuta: npx prisma db seed\n');
        } else {
            users.forEach(user => {
                console.log(`\n   📧 ${user.email}`);
                console.log(`      ID: ${user.id}`);
                console.log(`      Nombre: ${user.name || 'N/A'}`);
                console.log(`      Rol: ${user.role}`);
                console.log(`      Deshabilitado: ${user.disabled ? 'SÍ ❌' : 'NO ✅'}`);
                console.log(`      Password hash: ${user.password ? user.password.substring(0, 20) + '...' : 'VACÍO ❌'}`);
                console.log(`      Creado: ${user.createdAt.toLocaleString()}`);
            });
        }

        // 4. Probar login con admin
        console.log('\n\n4️⃣  Probando login del usuario admin...');
        const adminUser = await prisma.user.findUnique({ 
            where: { email: 'admin@accesoit.com' } 
        });

        if (!adminUser) {
            console.log('❌ Usuario admin@accesoit.com NO EXISTE');
            console.log('   Solución: Ejecuta npx prisma db seed\n');
        } else {
            console.log('✅ Usuario admin encontrado');
            
            // Verificar password
            const testPassword = 'admin123';
            const isValid = await bcrypt.compare(testPassword, adminUser.password);
            
            if (isValid) {
                console.log(`✅ Password '${testPassword}' es válida`);
            } else {
                console.log(`❌ Password '${testPassword}' NO es válida`);
                console.log('   El hash almacenado puede estar corrupto');
            }

            if (adminUser.disabled) {
                console.log('⚠️  Usuario admin está DESHABILITADO');
            }
        }

        // 5. Verificar planes
        console.log('\n\n5️⃣  Verificando planes n8n...');
        const plans = await prisma.plan.findMany();
        console.log(`✅ Total de planes: ${plans.length}`);
        plans.forEach(plan => {
            console.log(`   - ${plan.name}: $${plan.priceMonthly}/mes (${plan.active ? 'activo' : 'inactivo'})`);
        });

        // 6. Verificar instancias n8n
        console.log('\n\n6️⃣  Verificando instancias n8n...');
        const instances = await prisma.n8nInstance.findMany();
        console.log(`✅ Total de instancias: ${instances.length}`);
        if (instances.length > 0) {
            instances.forEach(inst => {
                console.log(`   - ${inst.slug} (${inst.status}) - User ID: ${inst.userId}`);
            });
        }

        // 7. Verificar tablas
        console.log('\n\n7️⃣  Verificando estructura de tablas...');
        const tables = await prisma.$queryRaw`
            -- For Postgres, update diagnostic queries accordingly (placeholder)
            SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema');
        `;
        console.log('✅ Tablas en la base de datos:');
        tables.forEach(table => {
            console.log(`   - ${table.name}`);
        });

        console.log('\n\n✅ DIAGNÓSTICO COMPLETADO\n');

    } catch (error) {
        console.error('\n❌ ERROR DURANTE EL DIAGNÓSTICO:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

// Función para resetear y crear usuario admin
async function resetAdmin() {
    console.log('🔄 RESETEANDO USUARIO ADMIN...\n');
    
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Eliminar admin existente
        await prisma.user.deleteMany({
            where: { email: 'admin@accesoit.com' }
        });
        console.log('🗑️  Usuario admin anterior eliminado');

        // Crear nuevo admin
        const admin = await prisma.user.create({
            data: {
                email: 'admin@accesoit.com',
                name: 'Admin User',
                company: 'AccesoIT Internal',
                password: hashedPassword,
                role: 'admin',
                disabled: false
            }
        });

        console.log('✅ Nuevo usuario admin creado:');
        console.log(`   Email: ${admin.email}`);
        console.log(`   Password: admin123`);
        console.log(`   Rol: ${admin.role}`);
        console.log(`   ID: ${admin.id}\n`);

    } catch (error) {
        console.error('❌ Error al resetear admin:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar según argumento
const command = process.argv[2];

if (command === 'reset-admin') {
    resetAdmin();
} else {
    diagnose();
}
