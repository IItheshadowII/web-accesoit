/**
 * Cliente para la API de Easypanel
 * Gestiona el ciclo de vida de servicios Docker (crear, obtener estado, iniciar, detener, eliminar)
 */

const EASYPANEL_URL = process.env.EASYPANEL_URL || 'http://localhost:3000';
const EASYPANEL_API_KEY = process.env.EASYPANEL_API_KEY || '';
const EASYPANEL_PROJECT_ID = process.env.EASYPANEL_PROJECT_ID || 'default';

/**
 * Crear un nuevo servicio n8n en Easypanel
 * @param {Object} config - Configuración del servicio
 * @param {string} config.slug - Identificador único (ej: cli-123)
 * @param {string} config.subdomain - Subdominio completo (ej: cli-123.n8n.accesoit.com.ar)
 * @param {string} config.adminEmail - Email del administrador
 * @param {string} config.adminPassword - Contraseña de basic auth
 * @param {string} config.encryptionKey - Clave de encriptación de n8n
 * @returns {Promise<Object>} - { serviceId, status }
 */
async function createN8nService({ slug, subdomain, adminEmail, adminPassword, adminUser, encryptionKey }) {
  try {
    // Configuración del servicio Docker para n8n
    const serviceConfig = {
      name: `n8n-${slug}`,
      project: EASYPANEL_PROJECT_ID,
      image: 'n8nio/n8n:latest',
      domains: [
        {
          host: subdomain,
          port: 5678,
          https: true
        }
      ],
      env: {
        N8N_HOST: subdomain,
        N8N_PORT: '5678',
        N8N_PROTOCOL: 'https',
        WEBHOOK_URL: `https://${subdomain}/`,
        N8N_BASIC_AUTH_ACTIVE: 'true',
        N8N_BASIC_AUTH_USER: adminUser,
        N8N_BASIC_AUTH_PASSWORD: adminPassword,
        N8N_ENCRYPTION_KEY: encryptionKey,
        N8N_PAYLOAD_SIZE_MAX: '16',
        // Variables opcionales para DB (si se desea usar Postgres en el futuro)
        // DB_TYPE: 'postgresdb',
        // DB_POSTGRESDB_HOST: '',
        // DB_POSTGRESDB_PORT: '5432',
        // DB_POSTGRESDB_DATABASE: `n8n_${slug}`,
        // DB_POSTGRESDB_USER: '',
        // DB_POSTGRESDB_PASSWORD: ''
      },
      volumes: [
        {
          name: `n8n-data-${slug}`,
          mountPath: '/home/node/.n8n'
        }
      ],
      resources: {
        cpuLimit: '0.5',
        memoryLimit: '1024M',
        reservedCpu: '0.1',
        reservedMemory: '512M'
      },
      restart: 'unless-stopped',
      network: 'easypanel' // Red de Easypanel
    };

    console.log(`[Easypanel] Creating n8n service: ${slug}`);

    // Si no hay API key configurada, simular creación (modo desarrollo)
    if (!EASYPANEL_API_KEY || process.env.MOCK_EASYPANEL === 'true') {
      console.log('[Easypanel] MOCK MODE - Simulating service creation');
      return {
        serviceId: `mock-service-${slug}-${Date.now()}`,
        status: 'running',
        url: `https://${subdomain}`
      };
    }

    // Llamada real a la API de Easypanel
    const response = await fetch(`${EASYPANEL_URL}/api/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EASYPANEL_API_KEY}`
      },
      body: JSON.stringify(serviceConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Easypanel API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log(`[Easypanel] Service created successfully: ${data.id || data.serviceId}`);

    return {
      serviceId: data.id || data.serviceId || `service-${slug}`,
      status: data.status || 'running',
      url: `https://${subdomain}`
    };

  } catch (error) {
    console.error('[Easypanel] Error creating service:', error);
    throw new Error(`Failed to create n8n service: ${error.message}`);
  }
}

/**
 * Obtener el estado de un servicio en Easypanel
 * @param {string} serviceId - ID del servicio en Easypanel
 * @returns {Promise<Object>} - { status, containerStatus, uptime, ... }
 */
async function getServiceStatus(serviceId) {
  try {
    // Modo mock
    if (!EASYPANEL_API_KEY || process.env.MOCK_EASYPANEL === 'true') {
      console.log(`[Easypanel] MOCK MODE - Getting status for ${serviceId}`);
      return {
        status: 'running',
        containerStatus: 'healthy',
        uptime: '2h 30m',
        cpu: '5%',
        memory: '512MB'
      };
    }

    const response = await fetch(`${EASYPANEL_URL}/api/services/${serviceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${EASYPANEL_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Easypanel API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      status: data.status || 'unknown',
      containerStatus: data.containerStatus || 'unknown',
      uptime: data.uptime,
      cpu: data.resources?.cpu,
      memory: data.resources?.memory
    };

  } catch (error) {
    console.error('[Easypanel] Error getting service status:', error);
    throw new Error(`Failed to get service status: ${error.message}`);
  }
}

/**
 * Detener un servicio en Easypanel
 * @param {string} serviceId - ID del servicio
 * @returns {Promise<Object>} - { success, message }
 */
async function stopService(serviceId) {
  try {
    console.log(`[Easypanel] Stopping service: ${serviceId}`);

    if (!EASYPANEL_API_KEY || process.env.MOCK_EASYPANEL === 'true') {
      console.log('[Easypanel] MOCK MODE - Simulating stop');
      return { success: true, message: 'Service stopped (mock)' };
    }

    const response = await fetch(`${EASYPANEL_URL}/api/services/${serviceId}/stop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EASYPANEL_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Easypanel API error: ${response.status}`);
    }

    return { success: true, message: 'Service stopped successfully' };

  } catch (error) {
    console.error('[Easypanel] Error stopping service:', error);
    throw new Error(`Failed to stop service: ${error.message}`);
  }
}

/**
 * Iniciar un servicio en Easypanel
 * @param {string} serviceId - ID del servicio
 * @returns {Promise<Object>} - { success, message }
 */
async function startService(serviceId) {
  try {
    console.log(`[Easypanel] Starting service: ${serviceId}`);

    if (!EASYPANEL_API_KEY || process.env.MOCK_EASYPANEL === 'true') {
      console.log('[Easypanel] MOCK MODE - Simulating start');
      return { success: true, message: 'Service started (mock)' };
    }

    const response = await fetch(`${EASYPANEL_URL}/api/services/${serviceId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EASYPANEL_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Easypanel API error: ${response.status}`);
    }

    return { success: true, message: 'Service started successfully' };

  } catch (error) {
    console.error('[Easypanel] Error starting service:', error);
    throw new Error(`Failed to start service: ${error.message}`);
  }
}

/**
 * Eliminar un servicio en Easypanel
 * @param {string} serviceId - ID del servicio
 * @param {boolean} deleteVolumes - Si eliminar también los volúmenes (datos persistentes)
 * @returns {Promise<Object>} - { success, message }
 */
async function deleteService(serviceId, deleteVolumes = false) {
  try {
    console.log(`[Easypanel] Deleting service: ${serviceId} (deleteVolumes: ${deleteVolumes})`);

    if (!EASYPANEL_API_KEY || process.env.MOCK_EASYPANEL === 'true') {
      console.log('[Easypanel] MOCK MODE - Simulating delete');
      return { success: true, message: 'Service deleted (mock)' };
    }

    const url = `${EASYPANEL_URL}/api/services/${serviceId}${deleteVolumes ? '?volumes=true' : ''}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${EASYPANEL_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Easypanel API error: ${response.status}`);
    }

    return { success: true, message: 'Service deleted successfully' };

  } catch (error) {
    console.error('[Easypanel] Error deleting service:', error);
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
