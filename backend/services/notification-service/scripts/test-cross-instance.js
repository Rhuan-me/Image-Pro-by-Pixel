const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

const JWT_SECRET = process.env.JWT_SECRET || '9OIO4sUpcFBu52TfMIg-_aiPci1KOJtmTPQaQDSreV0';
const INSTANCE_1_URL = process.env.INSTANCE_1_URL || 'wss://localhost:4000';
const INSTANCE_2_URL = process.env.INSTANCE_2_URL || 'wss://localhost:4001';

function makeToken(userId) {
  return jwt.sign(
    { userId, roles: ['user'] },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      subject: userId,
      jwtid: crypto.randomUUID(),
      issuer: 'pixpro-auth-service',
      audience: 'pixpro-api',
      expiresIn: '1h'
    }
  );
}

async function runCrossInstanceDemo() {
  const token1 = makeToken('usr_remetente_instancia_1');
  const token2 = makeToken('usr_destinatario_instancia_2');

  console.log('1. Conectando Cliente 1 na Instância 1 (notification-service-1 -> porta 4000)...');
  const ws1 = new WebSocket(`${INSTANCE_1_URL}/?token=${token1}`, { rejectUnauthorized: false });

  console.log('2. Conectando Cliente 2 na Instância 2 (notification-service-2 -> porta 4001)...');
  const ws2 = new WebSocket(`${INSTANCE_2_URL}/?token=${token2}`, { rejectUnauthorized: false });

  await Promise.all([
    new Promise((resolve, reject) => { ws1.once('open', resolve); ws1.once('error', reject); }),
    new Promise((resolve, reject) => { ws2.once('open', resolve); ws2.once('error', reject); })
  ]);

  console.log('Ambos os clientes conectados em instâncias distintas!\n');

  ws2.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === 'WELCOME') {
      console.log(`[Cliente 2 @ ${INSTANCE_2_URL}] Handshake concluído na instância: ${msg.instanceId}`);
      return;
    }
    console.log('\n====================================================================');
    console.log('[SUCESSO - COMUNICAÇÃO CRUZADA VIA REDIS BACKPLANE]');
    console.log('Cliente 2 (conectado na Instância 2 - porta 4001) recebeu o evento');
    console.log('publicado originalmente na Instância 1 (porta 4000):');
    console.log(JSON.stringify(msg, null, 2));
    console.log('====================================================================\n');
    ws1.close();
    ws2.close();
    process.exit(0);
  });

  // Aguarda 500ms para garantir o handshake de boas-vindas e envia mensagem pela Instância 1
  setTimeout(() => {
    const payload = {
      type: 'BROADCAST',
      event: 'CrossInstanceBackplaneTest',
      message: 'Evento enviado pela Instância 1 (4000) e propagado via Redis Pub/Sub para a Instância 2 (4001)!',
      data: {
        imageId: 'img_backplane_demo_001',
        status: 'COMPLETED'
      }
    };
    console.log('3. Enviando mensagem pelo Cliente 1 na Instância 1 (porta 4000):');
    console.log(JSON.stringify(payload, null, 2));
    ws1.send(JSON.stringify(payload));
  }, 500);
}

runCrossInstanceDemo().catch((err) => {
  console.error('Erro ao executar teste entre instâncias:', err.message);
  process.exit(1);
});
