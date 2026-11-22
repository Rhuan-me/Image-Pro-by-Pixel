const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

const JWT_SECRET = process.env.JWT_SECRET || '9OIO4sUpcFBu52TfMIg-_aiPci1KOJtmTPQaQDSreV0';
const JWT_ISSUER = process.env.JWT_ISSUER || 'pixpro-auth-service';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'pixpro-api';
const USER_ID = process.env.TEST_USER_ID || 'usr_ana_martins_01';

const ENDPOINTS = (process.env.WS_ENDPOINTS || 'wss://localhost:4000,wss://localhost:4001')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

function generateToken(userId = USER_ID) {
  return jwt.sign(
    { userId, roles: ['user'] },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      subject: userId,
      jwtid: crypto.randomUUID(),
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: '2h'
    }
  );
}

const token = generateToken();
console.log('========================================================================');
console.log('[Cliente Resiliente WSS] Token JWT gerado para testes (válido por 2h):');
console.log(token);
console.log('------------------------------------------------------------------------');
console.log('Dica para testar com wscat na Instância 1 (porta 4000):');
console.log(`npx wscat -n -c "wss://localhost:4000/?token=${token}"`);
console.log('Dica para testar com wscat na Instância 2 (porta 4001):');
console.log(`npx wscat -n -c "wss://localhost:4001/?token=${token}"`);
console.log('========================================================================\n');

let endpointIndex = 0;
let retryCount = 0;
let activeSocket = null;
let pingTimer = null;

function connectWithAutoReconnect() {
  const baseUrl = ENDPOINTS[endpointIndex % ENDPOINTS.length];
  const targetUrl = `${baseUrl}/?token=${token}`;

  console.log(`[Cliente WSS] Conectando em ${baseUrl} (tentativa #${retryCount + 1})...`);

  const ws = new WebSocket(targetUrl, { rejectUnauthorized: false });
  activeSocket = ws;

  ws.on('open', () => {
    retryCount = 0;
    console.log(`[Cliente WSS] CONECTADO com sucesso ao hub: ${baseUrl}`);

    clearInterval(pingTimer);
    pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 15000);
  });

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      console.log(`[Cliente WSS <- ${baseUrl}] Mensagem recebida:`, JSON.stringify(parsed, null, 2));
    } catch {
      console.log(`[Cliente WSS <- ${baseUrl}] Mensagem bruta:`, data.toString());
    }
  });

  ws.on('close', (code, reason) => {
    clearInterval(pingTimer);
    console.warn(
      `\n[Cliente WSS] Conexão encerrada com ${baseUrl} (code=${code}, reason=${reason.toString() || 'queda abrupta / container kill'}).`
    );
    scheduleReconnect();
  });

  ws.on('error', (err) => {
    console.error(`[Cliente WSS] Erro de conexão em ${baseUrl}: ${err.message}`);
  });
}

function scheduleReconnect() {
  retryCount += 1;
  // Rotaciona automaticamente para a próxima instância disponível (failover 4000 <-> 4001)
  endpointIndex = (endpointIndex + 1) % ENDPOINTS.length;
  const nextEndpoint = ENDPOINTS[endpointIndex];
  const delayMs = Math.min(10000, 1000 * Math.pow(1.5, Math.min(retryCount - 1, 5)));

  console.log(
    `[Reconexão Automática] Agendando reconexão #${retryCount} para ${nextEndpoint} em ${Math.round(delayMs)}ms...`
  );
  setTimeout(connectWithAutoReconnect, delayMs);
}

connectWithAutoReconnect();
