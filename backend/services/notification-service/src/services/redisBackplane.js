const crypto = require('node:crypto');
const WebSocket = require('ws');
const { env } = require('../config/env');
const { redisClient, redisReady, createRedisSubscriber } = require('../config/redis');

let subscriberClient = null;
let isSubscribed = false;

/**
 * Envia payload JSON para um conjunto ou único socket WebSocket aberto.
 */
function sendToSockets(target, payloadString) {
  let count = 0;
  if (!target) return count;

  const sockets = target instanceof Set ? target : [target];
  for (const ws of sockets) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(payloadString);
      count += 1;
    }
  }
  return count;
}

/**
 * Entrega uma mensagem recebida do Redis Backplane para os clientes WebSocket
 * conectados localmente nesta instância.
 */
function deliverLocalNotification(activeConnections, envelope, instanceId = env.instanceId) {
  const { originInstance, targetUserId, broadcast, payload, eventId, timestamp } = envelope;

  const outgoingMessage = JSON.stringify({
    ...payload,
    backplane: {
      eventId,
      originInstance,
      deliveredByInstance: instanceId,
      channel: env.redisBackplaneChannel,
      timestamp
    }
  });

  let deliveredCount = 0;

  if (!broadcast && targetUserId && targetUserId !== '*') {
    if (activeConnections.has(targetUserId)) {
      deliveredCount += sendToSockets(activeConnections.get(targetUserId), outgoingMessage);
    }
  } else {
    for (const [, sockets] of activeConnections.entries()) {
      deliveredCount += sendToSockets(sockets, outgoingMessage);
    }
  }

  if (deliveredCount > 0) {
    console.log(
      `[WebSocket][${instanceId}] Evento (${eventId}) propagado via Redis Backplane entregue a ${deliveredCount} conexão(ões) local(is) ` +
      `(origem: ${originInstance}, destino: ${targetUserId || 'BROADCAST'}).`
    );
  } else {
    console.log(
      `[Redis Backplane][${instanceId}] Evento (${eventId}) recebido de '${originInstance}', ` +
      `mas nenhum cliente alvo (${targetUserId || 'BROADCAST'}) está conectado nesta instância.`
    );
  }

  return deliveredCount;
}

/**
 * Inicializa a assinatura (SUBSCRIBE) no canal global do Redis Backplane.
 */
async function initRedisBackplane(activeConnections, options = {}) {
  const channel = options.channel || env.redisBackplaneChannel;
  const instanceId = options.instanceId || env.instanceId;

  try {
    await redisReady;
    const sub = options.subscriber || createRedisSubscriber();
    await sub.connect();

    await sub.subscribe(channel, (rawMessage) => {
      try {
        const envelope = JSON.parse(rawMessage);
        console.log(
          `[Redis Backplane][${instanceId}] Mensagem recebida no canal '${channel}' ` +
          `| eventId=${envelope.eventId} | origem=${envelope.originInstance} | destino=${envelope.targetUserId || 'BROADCAST'}`
        );
        deliverLocalNotification(activeConnections, envelope, instanceId);
      } catch (err) {
        console.error(`[Redis Backplane][${instanceId}] Erro ao processar mensagem do canal '${channel}':`, err.message);
      }
    });

    subscriberClient = sub;
    isSubscribed = true;
    console.log(`[Redis Backplane][${instanceId}] Inscrito e escutando canal Pub/Sub global '${channel}'.`);
    return sub;
  } catch (err) {
    console.error(`[Redis Backplane][${instanceId}] Falha ao inicializar subscriber do Redis Backplane:`, err.message);
    return null;
  }
}

/**
 * Publica (PUBLISH) um evento global no canal do Redis Backplane para que todas
 * as instâncias do notification-service propaguem aos seus respectivos clientes.
 */
async function publishToBackplane({ targetUserId = null, broadcast = false, payload = {}, originInstance = env.instanceId }) {
  const channel = env.redisBackplaneChannel;
  const envelope = {
    eventId: payload.eventId || crypto.randomUUID(),
    originInstance,
    targetUserId: broadcast ? null : targetUserId,
    broadcast: Boolean(broadcast || !targetUserId),
    payload,
    timestamp: Date.now()
  };

  await redisReady;
  await redisClient.publish(channel, JSON.stringify(envelope));

  console.log(
    `[Redis Backplane][${originInstance}] Evento publicado no canal '${channel}' ` +
    `| eventId=${envelope.eventId} | tipo=${payload.type || 'NOTIFICATION'} | destino=${envelope.targetUserId || 'BROADCAST'}`
  );

  return envelope;
}

async function closeRedisBackplane() {
  if (subscriberClient) {
    try {
      await subscriberClient.unsubscribe(env.redisBackplaneChannel);
      await subscriberClient.quit();
    } catch {}
    subscriberClient = null;
    isSubscribed = false;
  }
}

module.exports = {
  initRedisBackplane,
  publishToBackplane,
  deliverLocalNotification,
  closeRedisBackplane,
  isBackplaneSubscribed: () => isSubscribed
};
