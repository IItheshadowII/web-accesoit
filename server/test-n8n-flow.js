#!/usr/bin/env node

/**
 * Script de prueba para el sistema de instancias n8n
 * Ejecutar: node test-n8n-flow.js
 */

const API_URL = 'http://localhost:3002';

async function testN8nFlow() {
    console.log('🧪 Iniciando prueba del sistema n8n...\n');

    // 1. Login
    console.log('1️⃣  Login como admin...');
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@accesoit.com',
            password: 'admin123'
        })
    });

    if (!loginRes.ok) {
        console.error('❌ Login falló');
        return;
    }

    const { token, user } = await loginRes.json();
    console.log(`✅ Login exitoso: ${user.name} (${user.email})`);
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    // 2. Listar planes
    console.log('2️⃣  Obteniendo planes disponibles...');
    const plansRes = await fetch(`${API_URL}/api/n8n/plans`);
    const plans = await plansRes.json();
    console.log(`✅ ${plans.length} plan(es) disponible(s):`);
    plans.forEach(plan => {
        console.log(`   - ${plan.name}: $${plan.priceMonthly}/mes`);
    });
    console.log();

    // 3. Verificar instancias existentes
    console.log('3️⃣  Verificando instancias existentes...');
    const existingRes = await fetch(`${API_URL}/api/n8n/instances/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const existingInstances = await existingRes.json();
    console.log(`✅ Usuario tiene ${existingInstances.length} instancia(s) existente(s)`);
    
    if (existingInstances.length > 0) {
        console.log('⚠️  Usuario ya tiene instancias. Saltando creación de nueva.\n');
        existingInstances.forEach(inst => {
            console.log(`   📦 ${inst.slug}`);
            console.log(`      URL: ${inst.url}`);
            console.log(`      Estado: ${inst.status}`);
            console.log(`      Usuario: ${inst.basicAuthUser}`);
            console.log(`      Password: ${inst.basicAuthPass}\n`);
        });
        return;
    }
    console.log();

    // 4. Crear nueva instancia (solo si no existe)
    console.log('4️⃣  Creando nueva instancia n8n...');
    const provisionRes = await fetch(`${API_URL}/api/n8n/instances/provision`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            planId: plans[0]?.id
        })
    });

    if (!provisionRes.ok) {
        const error = await provisionRes.json();
        console.error(`❌ Error al crear instancia: ${error.error}`);
        return;
    }

    const { instance } = await provisionRes.json();
    console.log('✅ Instancia creada exitosamente!');
    console.log(`   Slug: ${instance.slug}`);
    console.log(`   URL: ${instance.url}`);
    console.log(`   Estado: ${instance.status}`);
    console.log(`   Usuario: ${instance.basicAuthUser}`);
    console.log(`   Password: ${instance.basicAuthPass}`);
    console.log(`   ID Easypanel: ${instance.easypanelServiceId || 'N/A'}\n`);

    // 5. Verificar instancia creada
    console.log('5️⃣  Verificando instancia en la lista...');
    const updatedRes = await fetch(`${API_URL}/api/n8n/instances/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const updatedInstances = await updatedRes.json();
    console.log(`✅ Total de instancias ahora: ${updatedInstances.length}\n`);

    // 6. Test webhook de pago (opcional)
    console.log('6️⃣  Simulando webhook de pago...');
    const webhookRes = await fetch(`${API_URL}/api/webhooks/payments/n8n`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            provider: 'stripe',
            event: 'subscription.created',
            customerId: 'cus_test_' + Date.now(),
            subscriptionId: 'sub_test_' + Date.now(),
            userId: user.id,
            planId: plans[0]?.id,
            status: 'active'
        })
    });

    if (webhookRes.ok) {
        console.log('✅ Webhook procesado correctamente\n');
    } else {
        console.log('⚠️  Webhook puede haber fallado (normal si usuario ya tiene instancia)\n');
    }

    console.log('🎉 Prueba completada!\n');
    console.log('📝 Próximos pasos:');
    console.log('   1. Verificar en Dashboard: http://localhost:5173');
    console.log('   2. Configurar Easypanel en .env para provisioning real');
    console.log('   3. Integrar pasarela de pagos (Stripe/MercadoPago)');
}

// Ejecutar test
testN8nFlow().catch(err => {
    console.error('❌ Error en prueba:', err.message);
    process.exit(1);
});
