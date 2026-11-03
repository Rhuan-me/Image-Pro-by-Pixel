const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Rota de teste simples
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'API funcionando!' });
});

module.exports = app;