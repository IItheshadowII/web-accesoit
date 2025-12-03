import dotenv from 'dotenv';
import path from 'path';

const envPath = process.env.NODE_ENV === 'production'
  ? undefined
  : path.resolve(process.cwd(), '.env');

dotenv.config({ path: envPath });

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';
export const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

if (!OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY is not set. OpenAI calls will fail.');
}
if (!N8N_WEBHOOK_URL) {
  console.warn('Warning: N8N_WEBHOOK_URL is not set. Webhook calls will fail.');
}
