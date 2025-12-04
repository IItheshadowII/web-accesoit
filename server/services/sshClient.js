/**
 * Cliente para gestionar instancias n8n mediante scripts bash en el host
 * Ejecuta comandos directamente en el host del contenedor
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Por defecto en modo MOCK hasta que se configure correctamente
const MOCK_MODE = process.env.MOCK_PROVISIONING !== 'false';

console.log('[Provisioning Client] Configuration:', {
  mockMode: MOCK_MODE,
  note: MOCK_MODE ? 'Set MOCK_PROVISIONING=false to enable real provisioning' : 'Real provisioning enabled'
});

/**
 * Ejecutar comando bash directamente
 * Los scripts están instalados en /usr/local/bin del host
 * y son accesibles desde el contenedor si se monta el socket de Docker
 */
async function executeCommand(command) {
  if (MOCK_MODE) {
    console.log(`[Provisioning] MOCK MODE - Would execute: ${command}`);
    return { stdout: `mock-output-${Date.now()}`, stderr: '' };
  }

  try {
    const result = await execPromise(command, { timeout: 30000 }); // 30 seg timeout
    return result;
  } catch (error) {
    throw new Error(`Command failed: ${error.message}`);
  }
}

/**
 * Crear una instancia n8n usando el script en el host
 */
async function createN8nService({ slug, subdomain, adminUser, adminPassword, encryptionKey }) {
  try {
    console.log(`[Provisioning] Creating n8n service: ${slug}`);

    if (MOCK_MODE) {
      console.log('[Provisioning] MOCK MODE - Simulating service creation');
      return {
        serviceId: `mock-n8n-${slug}`,
        status: 'running',
        url: `https://${subdomain}`
      };
    }

    const command = `/usr/local/bin/easypanel-create-n8n "${slug}" "${subdomain}" "${adminUser}" "${adminPassword}" "${encryptionKey}"`;
    const { stdout, stderr } = await executeCommand(command);

    if (stderr && !stdout) {
      throw new Error(`Failed to create service: ${stderr}`);
    }

    // El script retorna el container ID
    const containerId = stdout.trim().split('\n').pop();

    console.log(`[Provisioning] Service created: ${containerId}`);

    return {
      serviceId: containerId,
      status: 'running',
      url: `https://${subdomain}`
    };

  } catch (error) {
    console.error('[Provisioning] Error creating service:', error);
    throw new Error(`Failed to create n8n service: ${error.message}`);
  }
}

/**
 * Obtener estado de un servicio
 */
async function getServiceStatus(serviceId) {
  try {
    if (MOCK_MODE) {
      return {
        status: 'running',
        containerStatus: 'healthy'
      };
    }

    const command = `docker inspect ${serviceId} --format '{{.State.Status}}'`;
    const { stdout } = await executeCommand(command);
    
    const status = stdout.trim();

    return {
      status: status,
      containerStatus: status === 'running' ? 'healthy' : status
    };

  } catch (error) {
    console.error('[Provisioning] Error getting service status:', error);
    return {
      status: 'unknown',
      containerStatus: 'error'
    };
  }
}

/**
 * Detener un servicio
 */
async function stopService(serviceId) {
  try {
    console.log(`[Provisioning] Stopping service: ${serviceId}`);

    if (MOCK_MODE) {
      console.log('[Provisioning] MOCK MODE - Simulating stop');
      return { success: true, message: 'Service stopped (mock)' };
    }

    const command = `/usr/local/bin/easypanel-stop-n8n "${serviceId}"`;
    await executeCommand(command);

    return { success: true, message: 'Service stopped successfully' };

  } catch (error) {
    console.error('[Provisioning] Error stopping service:', error);
    throw new Error(`Failed to stop service: ${error.message}`);
  }
}

/**
 * Iniciar un servicio
 */
async function startService(serviceId) {
  try {
    console.log(`[Provisioning] Starting service: ${serviceId}`);

    if (MOCK_MODE) {
      console.log('[Provisioning] MOCK MODE - Simulating start');
      return { success: true, message: 'Service started (mock)' };
    }

    const command = `/usr/local/bin/easypanel-start-n8n "${serviceId}"`;
    await executeCommand(command);

    return { success: true, message: 'Service started successfully' };

  } catch (error) {
    console.error('[Provisioning] Error starting service:', error);
    throw new Error(`Failed to start service: ${error.message}`);
  }
}

/**
 * Eliminar un servicio
 */
async function deleteService(serviceId, deleteVolumes = false) {
  try {
    console.log(`[Provisioning] Deleting service: ${serviceId} (deleteVolumes: ${deleteVolumes})`);

    if (MOCK_MODE) {
      console.log('[Provisioning] MOCK MODE - Simulating delete');
      return { success: true, message: 'Service deleted (mock)' };
    }

    const command = `/usr/local/bin/easypanel-delete-n8n "${serviceId}" "${deleteVolumes}"`;
    await executeCommand(command);

    return { success: true, message: 'Service deleted successfully' };

  } catch (error) {
    console.error('[Provisioning] Error deleting service:', error);
    throw new Error(`Failed to delete service: ${error.message}`);
  }
}

module.exports = {
  createN8nService,
  getServiceStatus,
  stopService,
  startService,
  deleteService
};
