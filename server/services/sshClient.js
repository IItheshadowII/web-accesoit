/**
 * Cliente HTTP para gestionar instancias n8n mediante servicio de provisioning
 * Se comunica con provisioning-service.js que corre en el host
 */

const PROVISIONING_URL = process.env.PROVISIONING_URL || 'http://192.168.1.41:3003';
const PROVISIONING_TOKEN = process.env.PROVISIONING_TOKEN || 'change-this-secret-token';
const MOCK_MODE = process.env.MOCK_PROVISIONING !== 'false';

console.log('[Provisioning Client] Configuration:', {
  url: PROVISIONING_URL,
  hasToken: !!PROVISIONING_TOKEN,
  mockMode: MOCK_MODE
});

/**
 * Hacer llamada HTTP al servicio de provisioning
 */
async function callProvisioningService(endpoint, method = 'POST', body = null) {
  if (MOCK_MODE) {
    console.log(`[Provisioning] MOCK MODE - Would call: ${method} ${endpoint}`);
    return { success: true, containerId: `mock-${Date.now()}` };
  }

  const url = `${PROVISIONING_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PROVISIONING_TOKEN}`
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    throw new Error(`Provisioning service error: ${error.message}`);
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

    const result = await callProvisioningService('/create', 'POST', {
      slug,
      subdomain,
      adminUser,
      adminPassword,
      encryptionKey
    });

    console.log(`[Provisioning] Service created: ${result.containerId}`);

    return {
      serviceId: result.containerId,
      status: 'running',
      url: result.url
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

    const result = await callProvisioningService(`/status/${serviceId}`, 'GET');

    return {
      status: result.status,
      containerStatus: result.status === 'running' ? 'healthy' : result.status
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

    await callProvisioningService('/stop', 'POST', { containerId: serviceId });

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

    await callProvisioningService('/start', 'POST', { containerId: serviceId });

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

    const endpoint = `/delete/${serviceId}${deleteVolumes ? '?volumes=true' : ''}`;
    await callProvisioningService(endpoint, 'DELETE');

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
