const { randomUUID } = require('node:crypto');
const rabbitmq = require('../config/rabbitmq');

function createProjectEvent(eventType, project) {
  return {
    eventId: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    data: {
      id: project.id,
      userId: project.userId,
      name: project.name
    }
  };
}

async function publishProjectCreated(project) {
  const event = createProjectEvent('ProjectCreated', project);
  await rabbitmq.publishEvent('project.created', event);
  return event;
}

async function publishProjectUpdated(project) {
  const event = createProjectEvent('ProjectUpdated', project);
  await rabbitmq.publishEvent('project.updated', event);
  return event;
}

module.exports = { publishProjectCreated, publishProjectUpdated };
