const fs = require('fs');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const url = require('url');
const app = require('./app');
const { env, validateEnv } = require('./config/env');
const { authMiddleware } = require('./middlewares/auth');
const { startRabbitConsumer } = require('./services/rabbitConsumer');
const { initRedisBackplane, publishToBackplane } = require('./services/redisBackplane');

try {
  validateEnv();
  console.log(`[Notification Service][${env.instanceId}] Ambiente validado com sucesso (${env.nodeEnv}).`);
} catch (err) {
  console.error(`[Notification Service][${env.instanceId}] Erro de ambiente: ${err.message}`);
  process.exit(1);
}

let server;
try {
  const serverOptions = {
    cert: fs.readFileSync('./certs/cert.pem'),
    key: fs.readFileSync('./certs/key.pem')
  };
  server = https.createServer(serverOptions, app);
} catch (err) {
  console.warn(`[AVISO][${env.instanceId}] Certificados SSL não encontrados em ./certs/ (${err.message}). Iniciando em modo HTTP/WS.`);
  server = http.createServer(app);
}

const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', async (request, socket, head) => {
  console.log(`[WSS Upgrade][${env.instanceId}] 1. Requisição de upgrade recebida:`, request.url);

  try {
    const parsedUrl = url.parse(request.url, true);
    request.path = parsedUrl.pathname;

    if (parsedUrl.query.token && !request.headers['authorization']) {
      request.headers['authorization'] = `Bearer ${parsedUrl.query.token}`;
      console.log(`[WSS Upgrade][${env.instanceId}] 2. Token extraído da query string e injetado nos headers.`);
    }

    if (typeof request.get !== 'function') {
      request.get = function (headerName) {
        return this.headers[headerName.toLowerCase()];
      };
    }

    let authFailed = false;

    const fakeRes = {
      status(code) {
        return {
          json(body) {
            authFailed = true;
            const message = body.error?.message || 'Token inválido ou expirado.';
            console.warn(`[WSS Upgrade][${env.instanceId}] Rejeitando conexão (${code}): ${message}`);

            socket.end(
              `HTTP/1.1 ${code} Unauthorized\r\n` +
              `Content-Type: text/plain; charset=utf-8\r\n` +
              `Connection: close\r\n\r\n` +
              `${message}`
            );
          }
        };
      }
    };

    await new Promise((resolve) => {
      authMiddleware(request, fakeRes, (err) => {
        if (err && !authFailed) {
          authFailed = true;
          console.warn(`[WSS Upgrade][${env.instanceId}] Rejeitado via next(err): ${err.message}`);
          socket.end(
            `HTTP/1.1 401 Unauthorized\r\n` +
            `Content-Type: text/plain; charset=utf-8\r\n` +
            `Connection: close\r\n\r\n` +
            `${err.message || 'Erro de autenticação.'}`
          );
        }
        resolve();
      });
    });

    if (authFailed) {
      return;
    }

    console.log(`[WSS Upgrade][${env.instanceId}] 6. Autenticação bem-sucedida! Realizando handleUpgrade...`);

    wss.handleUpgrade(request, socket, head, (ws) => {
      console.log(`[WSS Upgrade][${env.instanceId}] 7. Conexão WSS estabelecida com sucesso.`);
      wss.emit('connection', ws, request);
    });
  } catch (err) {
    console.error(`[WSS Upgrade][${env.instanceId}] ERRO CRÍTICO NO CATCH:`, err);
    try {
      socket.end(`HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\nInternal Server Error`);
    } catch (e) {}
  }
});

const activeConnections = new Map();

function addConnection(userId, ws) {
  if (!activeConnections.has(userId)) {
    activeConnections.set(userId, new Set());
  }
  activeConnections.get(userId).add(ws);
}

function removeConnection(userId, ws) {
  const userSockets = activeConnections.get(userId);
  if (!userSockets) return;
  userSockets.delete(ws);
  if (userSockets.size === 0) {
    activeConnections.delete(userId);
  }
}

wss.on('connection', (ws, request) => {
  const userId = request.auth?.subject;

  if (!userId) {
    ws.close(4001, 'ID de usuário não identificado.');
    return;
  }

  addConnection(userId, ws);
  console.log(`[WebSocket][${env.instanceId}] Usuário autenticado conectado: ID ${userId} (clientes ativos: ${activeConnections.size})`);

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.send(JSON.stringify({
    type: 'WELCOME',
    instanceId: env.instanceId,
    userId,
    message: `Olá, cliente! Conexão WSS estabelecida na instância ${env.instanceId}.`
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (!data.type || typeof data.type !== 'string') {
        console.warn(`[WebSocket][${env.instanceId}] Mensagem recebida sem campo 'type' válido do usuário ${userId}`);
        ws.send(JSON.stringify({
          error: {
            code: 'INVALID_MESSAGE_FORMAT',
            message: 'O campo "type" é obrigatório e deve ser uma string.'
          }
        }));
        return;
      }

      if (data.type === 'PING') {
        ws.send(JSON.stringify({
          type: 'PONG',
          instanceId: env.instanceId,
          timestamp: Date.now()
        }));
        return;
      }

      // Permite publicar eventos no Redis Backplane diretamente via WebSocket (ex: wscat)
      if (['BROADCAST', 'NOTIFY', 'MESSAGE'].includes(data.type.toUpperCase())) {
        const targetUserId = data.targetUserId || (data.type.toUpperCase() === 'NOTIFY' ? userId : null);
        const isBroadcast = data.type.toUpperCase() === 'BROADCAST' || !targetUserId;

        const envelope = await publishToBackplane({
          targetUserId,
          broadcast: isBroadcast,
          payload: {
            type: 'NOTIFICATION',
            event: data.event || data.type.toUpperCase(),
            senderUserId: userId,
            data: {
              ...(data.data || {}),
              message: data.message || 'Mensagem enviada via Redis Backplane'
            },
            timestamp: Date.now()
          }
        });

        ws.send(JSON.stringify({
          type: 'PUBLISHED_ACK',
          instanceId: env.instanceId,
          eventId: envelope.eventId,
          channel: env.redisBackplaneChannel,
          timestamp: envelope.timestamp
        }));
      }
    } catch (e) {
      ws.send(JSON.stringify({ error: 'Formato JSON inválido.' }));
    }
  });

  ws.on('close', () => {
    removeConnection(userId, ws);
    console.log(`[WebSocket][${env.instanceId}] Usuário desconectado: ID ${userId}`);
  });
});

initRedisBackplane(activeConnections);
startRabbitConsumer(activeConnections);

server.listen(env.port, () => {
  console.log(`[Notification Service][${env.instanceId}] Servidor WSS seguro rodando na porta ${env.port}`);
});
