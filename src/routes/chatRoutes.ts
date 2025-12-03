import express from 'express';
import { ChatMessage } from '../types/visit';
import { processChat } from '../services/openaiService';

const router = express.Router();

router.post('/', async (req, res) => {
  const body = req.body as { messages?: ChatMessage[] };
  console.log('[ChatRoute] /api/chat incoming request body:', JSON.stringify(body).slice(0,1000));
  if (!body || !Array.isArray(body.messages)) {
    return res.status(400).json({ error: 'messages array is required in the body' });
  }

  try {
    const reply = await processChat(body.messages);
    res.json({ reply });
  } catch (err: any) {
    console.error('/api/chat error:', err?.message || err);
    res.status(500).json({ error: 'Failed to process chat', details: err?.message || String(err) });
  }
});

export default router;
