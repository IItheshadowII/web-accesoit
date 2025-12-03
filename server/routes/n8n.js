const express = require('express');
const router = express.Router();
const {
    provisionN8nInstance,
    stopN8nInstance,
    startN8nInstance,
    deleteN8nInstance,
    getN8nInstanceStatus
} = require('../services/n8nProvisioner');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/n8n/instances/me - Listar instancias del usuario autenticado
 */
router.get('/instances/me', async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const instances = await prisma.n8nInstance.findMany({
            where: { userId: req.user.id },
            include: { plan: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(instances);
    } catch (error) {
        console.error('[N8N API] Error fetching instances:', error);
        res.status(500).json({ error: 'Failed to fetch instances' });
    }
});

/**
 * GET /api/n8n/instances/:id - Obtener detalles de una instancia específica
 */
router.get('/instances/:id', async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const instanceId = parseInt(req.params.id);

    try {
        const instance = await prisma.n8nInstance.findUnique({
            where: { id: instanceId },
            include: { plan: true, user: { select: { id: true, email: true, name: true } } }
        });

        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        // Verificar que el usuario sea el dueño o admin
        if (instance.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        res.json(instance);
    } catch (error) {
        console.error('[N8N API] Error fetching instance:', error);
        res.status(500).json({ error: 'Failed to fetch instance' });
    }
});

/**
 * POST /api/n8n/instances/provision - Crear nueva instancia
 * Body: { planId?: number }
 */
router.post('/instances/provision', async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { planId } = req.body;

    try {
        const instance = await provisionN8nInstance(req.user.id, planId);
        res.json({ success: true, instance });
    } catch (error) {
        console.error('[N8N API] Error provisioning instance:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/n8n/instances/:id/toggle - Alternar entre iniciar/detener instancia
 */
router.patch('/instances/:id/toggle', async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const instanceId = parseInt(req.params.id);

    try {
        const instance = await prisma.n8nInstance.findUnique({
            where: { id: instanceId }
        });

        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        if (instance.userId !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        let result;
        if (instance.status === 'running') {
            result = await stopN8nInstance(instanceId, req.user.id);
        } else if (instance.status === 'stopped') {
            result = await startN8nInstance(instanceId, req.user.id);
        } else {
            return res.status(400).json({ error: `Cannot toggle instance in ${instance.status} state` });
        }

        res.json(result);
    } catch (error) {
        console.error('[N8N API] Error toggling instance:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/n8n/instances/:id/start - Iniciar instancia detenida
 */
router.post('/instances/:id/start', async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const instanceId = parseInt(req.params.id);

    try {
        const result = await startN8nInstance(instanceId, req.user.id);
        res.json(result);
    } catch (error) {
        console.error('[N8N API] Error starting instance:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/n8n/instances/:id/stop - Detener instancia en ejecución
 */
router.post('/instances/:id/stop', async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const instanceId = parseInt(req.params.id);

    try {
        const result = await stopN8nInstance(instanceId, req.user.id);
        res.json(result);
    } catch (error) {
        console.error('[N8N API] Error stopping instance:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/n8n/instances/:id - Eliminar instancia
 * Body: { hardDelete?: boolean }
 */
router.delete('/instances/:id', async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const instanceId = parseInt(req.params.id);
    const { hardDelete } = req.body;

    try {
        const result = await deleteN8nInstance(instanceId, req.user.id, hardDelete);
        res.json(result);
    } catch (error) {
        console.error('[N8N API] Error deleting instance:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/n8n/instances/:id/status - Obtener estado desde Easypanel
 */
router.get('/instances/:id/status', async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const instanceId = parseInt(req.params.id);

    try {
        // Verificar ownership
        const instance = await prisma.n8nInstance.findUnique({
            where: { id: instanceId }
        });

        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        if (instance.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const status = await getN8nInstanceStatus(instanceId);
        res.json(status);
    } catch (error) {
        console.error('[N8N API] Error getting instance status:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/n8n/plans - Listar planes disponibles (público o protegido según preferencia)
 */
router.get('/plans', async (req, res) => {
    try {
        const plans = await prisma.plan.findMany({
            where: { active: true },
            orderBy: { priceMonthly: 'asc' }
        });
        res.json(plans);
    } catch (error) {
        console.error('[N8N API] Error fetching plans:', error);
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});

module.exports = router;
