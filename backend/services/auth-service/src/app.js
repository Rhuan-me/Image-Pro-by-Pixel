require('dotenv').config();

const express = require('express');
const sequelize = require('./config/database');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.disable('x-powered-by');

app.use(express.json({ limit: '10kb' }));

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ status: 'ok', service: 'auth-service' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.get('/ready', async (req, res) => {
  try {
    await sequelize.authenticate();

    return res.status(200).json({
      status: 'ready',
      service: 'auth-service'
    });
  } catch {
    return res.status(503).json({
      status: 'unavailable',
      service: 'auth-service'
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'Rota não encontrada.'
    }
  });
});

app.use(errorHandler);

module.exports = app;