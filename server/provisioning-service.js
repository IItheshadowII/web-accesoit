#!/usr/bin/env node

/**
 * Microservicio HTTP para provisioning de n8n
 * Ejecuta comandos Docker en el host y responde via HTTP
 * Puerto: 3003 (interno, solo accesible desde red Docker)
 */

const http = require('http');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PORT = 3003;
const SECRET_TOKEN = process.env.PROVISIONING_SECRET || 'change-this-secret-token';

const server = http.createServer(async (req, res) => {
  // CORS para contenedor web-accesoit
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Verificar token de autenticación
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  // POST /create - Crear instancia n8n
  if (req.method === 'POST' && req.url === '/create') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { slug, subdomain, adminUser, adminPassword, encryptionKey } = JSON.parse(body);
        
        console.log(`[Provisioning] Creating n8n instance: ${slug}`);

        const command = `docker run -d \
          --name "n8n-${slug}" \
          --network easypanel \
          --restart unless-stopped \
          -e N8N_HOST="${subdomain}" \
          -e N8N_PORT="5678" \
          -e N8N_PROTOCOL="https" \
          -e WEBHOOK_URL="https://${subdomain}/" \
          -e N8N_BASIC_AUTH_ACTIVE="true" \
          -e N8N_BASIC_AUTH_USER="${adminUser}" \
          -e N8N_BASIC_AUTH_PASSWORD="${adminPassword}" \
          -e N8N_ENCRYPTION_KEY="${encryptionKey}" \
          -e N8N_PAYLOAD_SIZE_MAX="16" \
          -l "traefik.enable=true" \
          -l "traefik.http.routers.n8n-${slug}.rule=Host(\\\`${subdomain}\\\`)" \
          -l "traefik.http.routers.n8n-${slug}.entrypoints=websecure" \
          -l "traefik.http.routers.n8n-${slug}.tls.certresolver=letsencrypt" \
          -l "traefik.http.services.n8n-${slug}.loadbalancer.server.port=5678" \
          -v "n8n-data-${slug}:/home/node/.n8n" \
          n8nio/n8n:latest`;

        const { stdout, stderr } = await execPromise(command);
        const containerId = stdout.trim();

        console.log(`[Provisioning] Created: ${containerId}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          containerId,
          url: `https://${subdomain}`
        }));

      } catch (error) {
        console.error('[Provisioning] Error creating:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // POST /stop - Detener instancia
  if (req.method === 'POST' && req.url === '/stop') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { containerId } = JSON.parse(body);
        await execPromise(`docker stop ${containerId}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // POST /start - Iniciar instancia
  if (req.method === 'POST' && req.url === '/start') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { containerId } = JSON.parse(body);
        await execPromise(`docker start ${containerId}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // DELETE /delete - Eliminar instancia
  if (req.method === 'DELETE' && req.url.startsWith('/delete/')) {
    const containerId = req.url.split('/')[2];
    const deleteVolumes = req.url.includes('volumes=true');
    
    try {
      const command = deleteVolumes 
        ? `docker rm -f -v ${containerId}`
        : `docker rm -f ${containerId}`;
      
      await execPromise(command);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // GET /status/:containerId - Ver estado
  if (req.method === 'GET' && req.url.startsWith('/status/')) {
    const containerId = req.url.split('/')[2];
    
    try {
      const { stdout } = await execPromise(`docker inspect ${containerId} --format '{{.State.Status}}'`);
      const status = stdout.trim();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // GET /health - Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'n8n-provisioning' }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Provisioning Service] Running on port ${PORT}`);
  console.log(`[Provisioning Service] Auth token: ${SECRET_TOKEN.substring(0, 10)}...`);
});
