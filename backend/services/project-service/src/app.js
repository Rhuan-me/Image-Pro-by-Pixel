const express = require('express');
const cors = require('cors');

const sequelize = require('./config/database');
const { errorHandler } = require('./middlewares/erros.middleware');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ status: 'ok', service: 'project-service' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api/projects', projectRoutes);

app.use(errorHandler);

module.exports = app;