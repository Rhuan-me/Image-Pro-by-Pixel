process.env.NODE_ENV = 'test';
process.env.JWT_ENABLED = 'false';
process.env.INSTANCE_ID = 'notification-service-test';
process.env.REDIS_BACKPLANE_CHANNEL = 'pixpro:notifications:backplane:test';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocket = require('ws');
const {
  initRedisBackplane,
  publishToBackplane,
  closeRedisBackplane
} = require('../src/services/redisBackplane');

test('Redis Backplane propaga mensagens publicadas na Instância 1 para clientes conectados na Instância 2', async () => {
  const connectionsInstance1 = new Map();
  const connectionsInstance2 = new Map();

  const receivedByClientOnInstance2 = [];
  const fakeWsClient2 = {
    readyState: WebSocket.OPEN,
    send: (msg) => {
      receivedByClientOnInstance2.push(JSON.parse(msg));
    }
  };

  connectionsInstance2.set('user-target-2', new Set([fakeWsClient2]));

  // Inicializa o subscriber simulando a Instância 2 escutando o canal global do Redis
  await initRedisBackplane(connectionsInstance2, {
    instanceId: 'notification-service-2'
  });

  // Publica o evento a partir da Instância 1
  const envelope = await publishToBackplane({
    originInstance: 'notification-service-1',
    targetUserId: 'user-target-2',
    broadcast: false,
    payload: {
      type: 'NOTIFICATION',
      event: 'ImageProcessed',
      data: {
        imageId: 'img-999',
        status: 'COMPLETED',
        message: 'Imagem processada via Backplane!'
      }
    }
  });

  assert.equal(receivedByClientOnInstance2.length, 1);
  assert.equal(receivedByClientOnInstance2[0].event, 'ImageProcessed');
  assert.equal(receivedByClientOnInstance2[0].data.imageId, 'img-999');
  assert.equal(receivedByClientOnInstance2[0].backplane.originInstance, 'notification-service-1');
  assert.equal(receivedByClientOnInstance2[0].backplane.eventId, envelope.eventId);

  // Verifica que a Instância 1 não tinha esse cliente localmente
  assert.equal(connectionsInstance1.size, 0);

  await closeRedisBackplane();
});

test('Cliente WebSocket realiza reconexão automática (failover) quando a Instância 1 sofre queda abrupta', async () => {
  // Sobe duas instâncias reais de servidor WebSocket em portas efêmeras
  const server1 = http.createServer();
  const wss1 = new WebSocket.Server({ server: server1 });
  wss1.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'WELCOME', instanceId: 'notification-service-1' }));
  });

  const server2 = http.createServer();
  const wss2 = new WebSocket.Server({ server: server2 });
  wss2.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'WELCOME', instanceId: 'notification-service-2' }));
  });

  await new Promise((resolve) => server1.listen(0, '127.0.0.1', resolve));
  await new Promise((resolve) => server2.listen(0, '127.0.0.1', resolve));

  const port1 = server1.address().port;
  const port2 = server2.address().port;
  const endpoints = [`ws://127.0.0.1:${port1}`, `ws://127.0.0.1:${port2}`];

  const connectedInstances = [];
  let idx = 0;

  await new Promise((resolve, reject) => {
    function connectClient() {
      const url = endpoints[idx % endpoints.length];
      const ws = new WebSocket(url);

      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        connectedInstances.push(msg.instanceId);

        if (msg.instanceId === 'notification-service-1') {
          // Simula queda repentina (kill) da Instância 1 derrubando todos os sockets e o servidor
          for (const client of wss1.clients) {
            client.terminate();
          }
          server1.close();
        } else if (msg.instanceId === 'notification-service-2') {
          ws.close();
          resolve();
        }
      });

      ws.on('close', () => {
        if (connectedInstances.length === 1) {
          idx += 1;
          setTimeout(connectClient, 50);
        }
      });

      ws.on('error', reject);
    }

    connectClient();
  });

  assert.deepEqual(connectedInstances, ['notification-service-1', 'notification-service-2']);
  await new Promise((resolve) => server2.close(resolve));
});
