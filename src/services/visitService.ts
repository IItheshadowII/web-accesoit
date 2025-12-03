import axios from 'axios';
import { Visit } from '../types/visit';
import { N8N_WEBHOOK_URL } from '../config/env';

export async function createVisitWebhook(visit: Visit) {
  if (!N8N_WEBHOOK_URL) {
    throw new Error('N8N_WEBHOOK_URL not configured');
  }

  console.log('[VisitService] Posting to n8n webhook', N8N_WEBHOOK_URL, 'payload:', visit);
  const resp = await axios.post(N8N_WEBHOOK_URL, visit, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });

  console.log('[VisitService] Received response from n8n webhook:', resp.status);
  return resp.data;
}
