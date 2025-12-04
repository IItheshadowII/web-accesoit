/**
 * Cliente SSH para gestionar instancias n8n mediante scripts en el host
 * Usa comandos SSH para ejecutar scripts en el servidor que gestiona Docker
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const SSH_HOST = process.env.SSH_HOST || 'localhost';
const SSH_USER = process.env.SSH_USER || 'ebanega';
const SSH_KEY = process.env.SSH_KEY || ''; // Path a la clave SSH si es necesario
const MOCK_MODE = process.env.MOCK_SSH !== 'false';

console.log('[SSH Client] Configuration:', {
  host: SSH_HOST,
  user: SSH_USER,
  hasKey: !!SSH_KEY,
  mockMode: MOCK_MODE
});

/**
 * Ejecutar comando SSH en el host
 */
async function executeSSH(command) {
  if (MOCK_MODE) {
    console.log(`[SSH] MOCK MODE - Would execute: ${command}`);
    return { stdout: 'mock-container-id', stderr: '' };
  }

  const sshCommand = SSH_KEY 
    ? `ssh -i ${SSH_KEY} ${SSH_USER}@${SSH_HOST} "${command}"`
    : `ssh ${SSH_USER}@${SSH_HOST} "${command}"`;

  try {
    const result = await execPromise(sshCommand);
    return result;
  } catch (error) {
    throw new Error(`SSH command failed: ${error.message}`);
  }
}

/**
 * Crear una instancia n8n usando el script en el host
 */
async function createN8nService({ slug, subdomain, adminUser, adminPassword, encryptionKey }) {
  try {
    console.log(`[SSH] Creating n8n service: ${slug}`);

    if (MOCK_MODE) {
      console.log('[SSH] MOCK MODE - Simulating service creation');
      return {
        serviceId: `mock-n8n-${slug}`,
        status: 'running',
        url: `https://${subdomain}`
      };
    }

    const command = `/usr/local/bin/easypanel-create-n8n "${slug}" "${subdomain}" "${adminUser}" "${adminPassword}" "${encryptionKey}"`;
    const { stdout, stderr } = await executeSSH(command);

    if (stderr && !stdout) {
      throw new Error(`Failed to create service: ${stderr}`);
    }

    // El script retorna el container ID
    const containerId = stdout.trim().split('\n').pop();

    console.log(`[SSH] Service created: ${containerId}`);

    return {
      serviceId: containerId,
      status: 'running',
      url: `https://${subdomain}`
    };

  } catch (error) {
    console.error('[SSH] Error creating service:', error);
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
    const { stdout } = await executeSSH(command);
    
    const status = stdout.trim();

    return {
      status: status,
      containerStatus: status === 'running' ? 'healthy' : status
    };

  } catch (error) {
    console.error('[SSH] Error getting service status:', error);
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
    console.log(`[SSH] Stopping service: ${serviceId}`);

    if (MOCK_MODE) {
      console.log('[SSH] MOCK MODE - Simulating stop');
      return { success: true, message: 'Service stopped (mock)' };
    }

    const command = `/usr/local/bin/easypanel-stop-n8n "${serviceId}"`;
    await executeSSH(command);

    return { success: true, message: 'Service stopped successfully' };

  } catch (error) {
    console.error('[SSH] Error stopping service:', error);
    throw new Error(`Failed to stop service: ${error.message}`);
  }
}

/**
 * Iniciar un servicio
 */
async function startService(serviceId) {
  try {
    console.log(`[SSH] Starting service: ${serviceId}`);

    if (MOCK_MODE) {
      console.log('[SSH] MOCK MODE - Simulating start');
      return { success: true, message: 'Service started (mock)' };
    }

    const command = `/usr/local/bin/easypanel-start-n8n "${serviceId}"`;
    await executeSSH(command);

    return { success: true, message: 'Service started successfully' };

  } catch (error) {
    console.error('[SSH] Error starting service:', error);
    throw new Error(`Failed to start service: ${error.message}`);
  }
}

/**
 * Eliminar un servicio
 */
async function deleteService(serviceId, deleteVolumes = false) {
  try {
    console.log(`[SSH] Deleting service: ${serviceId} (deleteVolumes: ${deleteVolumes})`);

    if (MOCK_MODE) {
      console.log('[SSH] MOCK MODE - Simulating delete');
      return { success: true, message: 'Service deleted (mock)' };
    }

    const command = `/usr/local/bin/easypanel-delete-n8n "${serviceId}" "${deleteVolumes}"`;
    await executeSSH(command);

    return { success: true, message: 'Service deleted successfully' };

  } catch (error) {
    console.error('[SSH] Error deleting service:', error);
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
