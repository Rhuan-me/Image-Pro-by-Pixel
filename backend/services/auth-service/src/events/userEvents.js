const { randomUUID } = require('node:crypto');
const rabbitmq = require('../config/rabbitmq');

function createUserEvent(eventType, user) {
  return {
    eventId: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    data: {
      userId: user.id,
      email: user.email
    }
  };
}

async function publishUserRegistered(user) {
  const event = createUserEvent('UserRegistered', user);
  await rabbitmq.publishEvent('user.registered', event);
  return event;
}

async function publishUserLoggedIn(user) {
  const event = createUserEvent('UserLoggedIn', user);
  await rabbitmq.publishEvent('user.logged_in', event);
  return event;
}

module.exports = { publishUserRegistered, publishUserLoggedIn };
