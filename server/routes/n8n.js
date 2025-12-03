const express = require('express');
const router = express.Router();
const { provisionN8nInstance } = require('../services/n8nProvisioner');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Middleware de autenticación (se debe pasar desde index.js o requerir aquí si es modular)
// Por simplicidad, asumimos que las rutas protegidas verifican req.user o usan un middleware global si se aplica en index.js

// GET /api/n8n/instances - Listar instancias del usuario
router.get('/instances', async (req, res) => {
    // Si hay middleware de auth, usar req.user.id. Si no, permitir query param para pruebas (INSEGURO en prod)
    const userId = req.user ? req.user.id : (parseInt(req.query.userId) || 0);

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const instances = await prisma.n8nInstance.findMany({
            where: { userId }
        });
        res.json(instances);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/n8n/provision - Trigger manual para pruebas (en prod sería vía webhook de pago)
router.post('/provision', async (req, res) => {
    // Permitir admin o usuario autenticado
    const userId = req.body.userId || (req.user ? req.user.id : null);

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const instance = await provisionN8nInstance(userId);
        res.json({ success: true, instance });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
