import express from 'express';
import { Visit } from '../types/visit';
import { createVisitWebhook } from '../services/visitService';

const router = express.Router();

router.post('/', async (req, res) => {
  const body = req.body as Visit;
  console.log('[VisitRoute] /api/visitas incoming body:', JSON.stringify(body).slice(0,1000));

  // Basic validation
  if (!body || !body.nombre || !body.fecha || !body.hora) {
    return res.status(400).json({ error: 'nombre, fecha y hora son requeridos' });
  }

  try {
    const result = await createVisitWebhook(body);
    return res.status(200).json({ status: 'ok', mensaje: 'Visita creada', fecha: body.fecha, hora: body.hora, result });
  } catch (err: any) {
    console.error('Error en /api/visitas:', err?.message || err);
    return res.status(500).json({ error: 'Error al crear la visita', details: err?.message || String(err) });
  }
});

export default router;
