/**
 * Cliente directo para Docker API
 * Crea servicios Docker directamente sin depender de Easypanel API
 */

const DOCKER_SOCKET = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
const DOCKER_NETWORK = process.env.DOCKER_NETWORK || 'easypanel';
const MOCK_MODE = process.env.MOCK_DOCKER !== 'false';

console.log('[Docker Client] Configuration:', {
  socket: DOCKER_SOCKET,
  network: DOCKER_NETWORK,
  mockMode: MOCK_MODE
});

/**
 * Crear un contenedor n8n usando Docker API directamente
 */
async function createN8nContainer({ slug, subdomain, adminUser, adminPassword, encryptionKey }) {
  try {
    console.log(`[Docker] Creating n8n container: ${slug}`);

    if (MOCK_MODE) {
      console.log('[Docker] MOCK MODE - Simulating container creation');
      return {
        containerId: `mock-container-${slug}-${Date.now()}`,
        status: 'running',
        url: `https://${subdomain}`
      };
    }

    // Configuración del contenedor
    const containerConfig = {
      name: `n8n-${slug}`,
      image: 'n8nio/n8n:latest',
      env: [
        `N8N_HOST=${subdomain}`,
        `N8N_PORT=5678`,
        `N8N_PROTOCOL=https`,
        `WEBHOOK_URL=https://${subdomain}/`,
        `N8N_BASIC_AUTH_ACTIVE=true`,
        `N8N_BASIC_AUTH_USER=${adminUser}`,
        `N8N_BASIC_AUTH_PASSWORD=${adminPassword}`,
        `N8N_ENCRYPTION_KEY=${encryptionKey}`,
        `N8N_PAYLOAD_SIZE_MAX=16`
      ],
      labels: {
        'traefik.enable': 'true',
        [`traefik.http.routers.n8n-${slug}.rule`]: `Host(\`${subdomain}\`)`,
        [`traefik.http.routers.n8n-${slug}.entrypoints`]: 'websecure',
        [`traefik.http.routers.n8n-${slug}.tls.certresolver`]: 'letsencrypt',
        [`traefik.http.services.n8n-${slug}.loadbalancer.server.port`]: '5678'
      },
      volumes: [
        {
          name: `n8n-data-${slug}`,
          path: '/home/node/.n8n'
        }
      ],
      network: DOCKER_NETWORK,
      restart: 'unless-stopped'
    };

    // Llamar a Docker API via socket Unix
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const options = {
        socketPath: DOCKER_SOCKET,
        path: '/containers/create?name=' + encodeURIComponent(`n8n-${slug}`),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const result = JSON.parse(data);
            console.log(`[Docker] Container created: ${result.Id}`);
            
            // Iniciar el contenedor
            startContainer(result.Id).then(() => {
              resolve({
                containerId: result.Id,
                status: 'running',
                url: `https://${subdomain}`
              });
            }).catch(reject);
          } else {
            reject(new Error(`Docker API error: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', reject);
      
      // Enviar configuración del contenedor
      req.write(JSON.stringify({
        Image: 'n8nio/n8n:latest',
        name: `n8n-${slug}`,
        Env: containerConfig.env,
        Labels: containerConfig.labels,
        HostConfig: {
          NetworkMode: DOCKER_NETWORK,
          RestartPolicy: { Name: 'unless-stopped' },
          Binds: [`n8n-data-${slug}:/home/node/.n8n`]
        }
      }));
      req.end();
    });

  } catch (error) {
    console.error('[Docker] Error creating container:', error);
    throw new Error(`Failed to create n8n container: ${error.message}`);
  }
}

/**
 * Iniciar un contenedor
 */
async function startContainer(containerId) {
  const http = require('http');
  
  return new Promise((resolve, reject) => {
    const req = http.request({
      socketPath: DOCKER_SOCKET,
      path: `/containers/${containerId}/start`,
      method: 'POST'
    }, (res) => {
      if (res.statusCode === 204 || res.statusCode === 304) {
        resolve();
      } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => reject(new Error(`Failed to start: ${data}`)));
      }
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Detener un contenedor
 */
async function stopContainer(containerId) {
  if (MOCK_MODE) {
    console.log(`[Docker] MOCK MODE - Simulating stop ${containerId}`);
    return { success: true };
  }

  const http = require('http');
  
  return new Promise((resolve, reject) => {
    const req = http.request({
      socketPath: DOCKER_SOCKET,
      path: `/containers/${containerId}/stop`,
      method: 'POST'
    }, (res) => {
      if (res.statusCode === 204 || res.statusCode === 304) {
        resolve({ success: true });
      } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => reject(new Error(`Failed to stop: ${data}`)));
      }
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Eliminar un contenedor
 */
async function deleteContainer(containerId, removeVolumes = false) {
  if (MOCK_MODE) {
    console.log(`[Docker] MOCK MODE - Simulating delete ${containerId}`);
    return { success: true };
  }

  const http = require('http');
  const query = removeVolumes ? '?v=1&force=1' : '?force=1';
  
  return new Promise((resolve, reject) => {
    const req = http.request({
      socketPath: DOCKER_SOCKET,
      path: `/containers/${containerId}${query}`,
      method: 'DELETE'
    }, (res) => {
      if (res.statusCode === 204) {
        resolve({ success: true });
      } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => reject(new Error(`Failed to delete: ${data}`)));
      }
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Obtener estado de un contenedor
 */
async function getContainerStatus(containerId) {
  if (MOCK_MODE) {
    return {
      status: 'running',
      state: 'Up 2 hours'
    };
  }

  const http = require('http');
  
  return new Promise((resolve, reject) => {
    const req = http.request({
      socketPath: DOCKER_SOCKET,
      path: `/containers/${containerId}/json`,
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const container = JSON.parse(data);
          resolve({
            status: container.State.Status,
            state: container.State.Running ? 'running' : 'stopped'
          });
        } else {
          reject(new Error(`Container not found: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = {
  createN8nContainer,
  startContainer,
  stopContainer,
  deleteContainer,
  getContainerStatus
};
