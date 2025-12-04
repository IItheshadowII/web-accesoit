const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
// Usar SSH client para ejecutar comandos en el host en lugar de API de Easypanel
const provisioningClient = require('./sshClient');
const prisma = new PrismaClient();

/**
 * Aprovisiona una nueva instancia de n8n para un usuario
 * @param {number} userId - ID del usuario
 * @param {number} planId - ID del plan (opcional)
 * @returns {Promise<Object>} - Instancia creada
 */
async function provisionN8nInstance(userId, planId = null) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Verificar si ya tiene una instancia activa
    const existing = await prisma.n8nInstance.findFirst({
        where: { 
            userId, 
            status: { notIn: ['cancelled', 'error'] } 
        }
    });
    if (existing) {
        throw new Error('User already has an active n8n instance');
    }

    // Generar credenciales únicas y seguras
    const slug = `cli${user.id}-${Date.now().toString(36).slice(-4)}`;
    const basicAuthUser = `user_${crypto.randomBytes(4).toString('hex')}`;
    const basicAuthPass = crypto.randomBytes(12).toString('base64').slice(0, 16) + 'A1!';
    const encryptionKey = crypto.randomBytes(16).toString('hex');
    const subdomain = `${slug}.n8n.accesoit.com.ar`;

    console.log(`[PROVISION] Starting provision for user ${user.email} (slug: ${slug})`);

    // 1. Crear registro en base de datos con estado "creating"
    const instance = await prisma.n8nInstance.create({
        data: {
            userId: user.id,
            planId,
            slug,
            url: `https://${subdomain}`,
            basicAuthUser,
            basicAuthPass,
            encryptionKey,
            status: 'creating',
        },
    });

    try {
        // 2. Crear servicio usando SSH client
        console.log(`[PROVISION] Creating service via SSH for ${slug}`);
        const easypanelResult = await provisioningClient.createN8nService({
            slug,
            subdomain,
            adminEmail: user.email,
            adminUser: basicAuthUser,
            adminPassword: basicAuthPass,
            encryptionKey
        });

        // 3. Actualizar instancia con ID de Easypanel y estado running
        await prisma.n8nInstance.update({
            where: { id: instance.id },
            data: {
                easypanelServiceId: easypanelResult.serviceId,
                status: 'running'
            }
        });

        console.log(`[PROVISION] Instance ${slug} provisioned successfully`);
        console.log(`[PROVISION] URL: ${instance.url}`);
        console.log(`[PROVISION] User: ${basicAuthUser}`);
        console.log(`[PROVISION] Pass: ${basicAuthPass}`);

        // 4. Enviar email con credenciales (simulado - integrar con nodemailer existente)
        await sendCredentialsEmail(user.email, {
            url: instance.url,
            user: basicAuthUser,
            password: basicAuthPass
        });

        return {
            ...instance,
            easypanelServiceId: easypanelResult.serviceId,
            status: 'running'
        };

    } catch (error) {
        console.error('[PROVISION] Error during provisioning:', error);
        
        // Marcar instancia como error
        await prisma.n8nInstance.update({
            where: { id: instance.id },
            data: { status: 'error' }
        });

        throw new Error(`Failed to provision n8n instance: ${error.message}`);
    }
}

/**
 * Detener una instancia de n8n
 * @param {number} instanceId - ID de la instancia
 * @param {number} requestUserId - ID del usuario que hace la petición
 */
async function stopN8nInstance(instanceId, requestUserId) {
    const instance = await prisma.n8nInstance.findUnique({
        where: { id: instanceId },
        include: { user: true }
    });

    if (!instance) throw new Error('Instance not found');
    
    // Verificar que el usuario sea el dueño
    if (instance.userId !== requestUserId) {
        throw new Error('Unauthorized: not the instance owner');
    }

    if (!instance.easypanelServiceId) {
        throw new Error('Instance has no Easypanel service ID');
    }

    await provisioningClient.stopService(instance.easypanelServiceId);
    
    await prisma.n8nInstance.update({
        where: { id: instanceId },
        data: { status: 'stopped' }
    });

    return { success: true, message: 'Instance stopped' };
}

/**
 * Iniciar una instancia de n8n
 * @param {number} instanceId - ID de la instancia
 * @param {number} requestUserId - ID del usuario que hace la petición
 */
async function startN8nInstance(instanceId, requestUserId) {
    const instance = await prisma.n8nInstance.findUnique({
        where: { id: instanceId },
        include: { user: true }
    });

    if (!instance) throw new Error('Instance not found');
    
    if (instance.userId !== requestUserId) {
        throw new Error('Unauthorized: not the instance owner');
    }

    if (!instance.easypanelServiceId) {
        throw new Error('Instance has no Easypanel service ID');
    }

    await provisioningClient.startService(instance.easypanelServiceId);
    
    await prisma.n8nInstance.update({
        where: { id: instanceId },
        data: { status: 'running' }
    });

    return { success: true, message: 'Instance started' };
}

/**
 * Eliminar una instancia de n8n
 * @param {number} instanceId - ID de la instancia
 * @param {number} requestUserId - ID del usuario que hace la petición
 * @param {boolean} hardDelete - Si eliminar también los datos persistentes
 */
async function deleteN8nInstance(instanceId, requestUserId, hardDelete = false) {
    const instance = await prisma.n8nInstance.findUnique({
        where: { id: instanceId },
        include: { user: true }
    });

    if (!instance) throw new Error('Instance not found');
    
    if (instance.userId !== requestUserId) {
        throw new Error('Unauthorized: not the instance owner');
    }

    if (instance.easypanelServiceId) {
        // Eliminar servicio via SSH
        await provisioningClient.deleteService(instance.easypanelServiceId, hardDelete);
    }

    // Soft delete: marcar como cancelled
    await prisma.n8nInstance.update({
        where: { id: instanceId },
        data: { status: 'cancelled' }
    });

    return { success: true, message: 'Instance deleted' };
}

/**
 * Obtener el estado de una instancia desde Easypanel
 * @param {number} instanceId - ID de la instancia
 */
async function getN8nInstanceStatus(instanceId) {
    const instance = await prisma.n8nInstance.findUnique({
        where: { id: instanceId }
    });

    if (!instance) throw new Error('Instance not found');
    
    if (!instance.easypanelServiceId) {
        return { status: instance.status, message: 'No Easypanel service' };
    }

    try {
        const easypanelStatus = await provisioningClient.getServiceStatus(instance.easypanelServiceId);
        return easypanelStatus;
    } catch (error) {
        console.error('[STATUS] Error getting status from provisioning client:', error);
        return { status: instance.status, error: error.message };
    }
}

/**
 * Enviar email con credenciales (stub - integrar con nodemailer existente)
 */
async function sendCredentialsEmail(email, credentials) {
    // TODO: Integrar con el sistema de email existente (nodemailer)
    console.log(`[EMAIL] Sending credentials to ${email}`);
    console.log(`[EMAIL] URL: ${credentials.url}`);
    console.log(`[EMAIL] User: ${credentials.user}`);
    console.log(`[EMAIL] Password: ${credentials.password}`);
    
    // Aquí debería ir la integración con nodemailer
    // const transporter = nodemailer.createTransport(...);
    // await transporter.sendMail({...});
    
    return { sent: true };
}

module.exports = {
    provisionN8nInstance,
    stopN8nInstance,
    startN8nInstance,
    deleteN8nInstance,
    getN8nInstanceStatus
};
