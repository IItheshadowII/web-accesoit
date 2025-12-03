const express = require('express');
const app = express();
const PORT = 3002;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Test server OK');
});

app.post('/api/chat', (req, res) => {
  console.log('Received POST to /api/chat');
  res.json({ reply: 'Test response' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
