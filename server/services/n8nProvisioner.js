const { exec } = require('child_process');
const util = require('util');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const execPromise = util.promisify(exec);

// Configuración (debería venir de .env)
const N8N_HOST_IP = process.env.N8N_HOST_IP || '192.168.1.100'; // IP del Proxmox/VM Docker
const N8N_HOST_USER = process.env.N8N_HOST_USER || 'root';

async function provisionN8nInstance(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Verificar si ya tiene una instancia activa (opcional, por ahora permitimos 1 por usuario)
    const existing = await prisma.n8nInstance.findFirst({
        where: { userId, status: { not: 'deleted' } }
    });
    if (existing) {
        throw new Error('User already has an active n8n instance');
    }

    const slug = `cli${user.id}`; // Simple slug strategy
    const basicAuthUser = `user_${crypto.randomBytes(4).toString('hex')}`;
    const basicAuthPass = crypto.randomBytes(8).toString('hex') + 'A1!';
    const encryptionKey = crypto.randomBytes(16).toString('hex');

    console.log(`[PROVISION] Starting provision for user ${user.email} (slug: ${slug})`);

    // 1. Crear registro en Cloudflare (Simulado o implementar llamada API real si hay credenciales)
    // await createCloudflareRecord(...) 
    console.log(`[MOCK] Creating DNS record for ${slug}.n8n.accesoit.com.ar`);

    // 2. Ejecutar script de provisión vía SSH
    // Nota: Requiere que la máquina donde corre esto tenga acceso SSH sin password (key) al host
    // El script debe estar en el host remoto en /opt/scripts/provision_n8n.sh
    const scriptPath = '/opt/scripts/provision_n8n.sh';
    const cmd = `ssh -o StrictHostKeyChecking=no ${N8N_HOST_USER}@${N8N_HOST_IP} "${scriptPath} ${slug} ${basicAuthUser} ${basicAuthPass} ${encryptionKey}"`;

    console.log(`[PROVISION] Executing SSH command: ${cmd}`);

    // En desarrollo/local, tal vez no queramos ejecutar el SSH real si no está configurado.
    // Podemos poner un flag para simular.
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SSH_PROVISIONING === 'true') {
        try {
            const { stdout, stderr } = await execPromise(cmd);
            console.log('[SSH STDOUT]', stdout);
            if (stderr) console.error('[SSH STDERR]', stderr);
        } catch (error) {
            console.error('[SSH ERROR]', error);
            throw new Error('Failed to execute provisioning script on host');
        }
    } else {
        console.log('[MOCK] Skipping SSH execution in non-production env (ENABLE_SSH_PROVISIONING not set)');
    }

    // 3. Guardar en DB
    const instance = await prisma.n8nInstance.create({
        data: {
            userId: user.id,
            slug,
            url: `https://${slug}.n8n.accesoit.com.ar`,
            host: 'n8n-host-01',
            basicAuthUser,
            basicAuthPass,
            encryptionKey,
            status: 'active',
        },
    });

    // 4. Enviar email (Simulado o usar nodemailer existente)
    console.log(`[MOCK] Sending email to ${user.email} with credentials: URL=${instance.url}, User=${basicAuthUser}, Pass=${basicAuthPass}`);

    return instance;
}

module.exports = { provisionN8nInstance };
