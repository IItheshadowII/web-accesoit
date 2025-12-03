const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server OK');
});

app.post('/api/chat', (req, res) => {
  console.log('POST /api/chat received:', req.body);
  res.json({ reply: 'Test response from /api/chat' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Minimal server running on http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
