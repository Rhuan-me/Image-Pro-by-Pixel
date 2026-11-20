const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const url = require('url');
const app = require('./app');
const { env, validateEnv } = require('./config/env');
const { authMiddleware } = require('./middlewares/auth');
const { startRabbitConsumer } = require('./services/rabbitConsumer');

try {
  validateEnv();
  console.log(`[Notification Service] Ambiente validado com sucesso (${env.nodeEnv}).`);
} catch (err) {
  console.error(`[Notification Service] Erro de ambiente: ${err.message}`);
  process.exit(1);
}

let serverOptions = {};
try {
  serverOptions = {
    cert: fs.readFileSync('./certs/cert.pem'),
    key: fs.readFileSync('./certs/key.pem')
  };
} catch (err) {
  console.warn('[AVISO] Certificados SSL não encontrados em ./certs/.');
}

const server = https.createServer(serverOptions, app);

const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', async (request, socket, head) => {
  console.log('[WSS Upgrade] 1. Requisição de upgrade recebida:', request.url);

  try {
    
    const parsedUrl = url.parse(request.url, true);
    request.path = parsedUrl.pathname;

    if (parsedUrl.query.token && !request.headers['authorization']) {
      request.headers['authorization'] = `Bearer ${parsedUrl.query.token}`;
      console.log('[WSS Upgrade] 2. Token extraído da query string e injetado nos headers.');
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
            console.warn(`[WSS Upgrade] Rejeitando conexão (${code}): ${message}`);

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
          console.warn(`[WSS Upgrade] Rejeitado via next(err): ${err.message}`);
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

    console.log('[WSS Upgrade] 6. Autenticação bem-sucedida! Realizando handleUpgrade...');

    wss.handleUpgrade(request, socket, head, (ws) => {
      console.log('[WSS Upgrade] 7. Conexão WSS estabelecida com sucesso.');
      wss.emit('connection', ws, request);
    });

  } catch (err) {
    console.error('[WSS Upgrade] ERRO CRÍTICO NO CATCH:', err);
    try {
      socket.end(`HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\nInternal Server Error`);
    } catch (e) {}
  }
});

const activeConnections = new Map();

wss.on('connection', (ws, request) => {
  const userId = request.auth?.subject;
  
  if (!userId) {
    ws.close(4001, 'ID de usuário não identificado.');
    return;
  }

  console.log(`[WebSocket] Usuário autenticado conectado: ID ${userId}`);
  activeConnections.set(userId, ws);

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.send(JSON.stringify({ message: "Olá, cliente! Conexão WSS estabelecida." }));
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (!data.type || typeof data.type !== 'string') {
        console.warn(`[WebSocket] Mensagem recebida sem campo 'type' válido do usuário ${userId}`);
        ws.send(JSON.stringify({ 
          error: {
            code: 'INVALID_MESSAGE_FORMAT',
            message: 'O campo "type" é obrigatório e deve ser uma string.' 
          }
        }));
        return;
      }

      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (e) {
      ws.send(JSON.stringify({ error: 'Formato JSON inválido.' }));
    }
  });

  ws.on('close', () => {
    activeConnections.delete(userId);
    console.log(`[WebSocket] Usuário desconectado: ID ${userId}`);
  });
});

startRabbitConsumer(activeConnections);

server.listen(env.port, () => {
  console.log(`[Notification Service] Servidor WSS seguro rodando na porta ${env.port}`);
});