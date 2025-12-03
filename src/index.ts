import express from 'express';
import cors from 'cors';
import { PORT } from './config/env';
import chatRoutes from './routes/chatRoutes';
import visitRoutes from './routes/visitRoutes';

const app = express();

// Simple request logger middleware
app.use((req, res, next) => {
  try {
    const bodySnippet = req.body ? JSON.stringify(req.body).slice(0, 1000) : '';
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - body: ${bodySnippet}`);
  } catch (e) {
    // ignore
  }
  next();
});

app.use(cors());
app.use(express.json());

app.use('/api/chat', chatRoutes);
app.use('/api/visitas', visitRoutes);

app.get('/', (req, res) => res.send('AccesoIT Chat API'));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
