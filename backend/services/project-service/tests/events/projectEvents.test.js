const test = require('node:test');
const assert = require('node:assert/strict');
const projectEvents = require('../../src/events/projectEvents');
const rabbitmq = require('../../src/config/rabbitmq');

test('projectEvents publishProjectCreated calls rabbitmq', async () => {
  const origPublish = rabbitmq.publishEvent;
  const published = [];
  rabbitmq.publishEvent = async (queue, data) => { published.push({ queue, data }); };

  try {
    const event = await projectEvents.publishProjectCreated({
      id: 'p-1',
      userId: 'u-1',
      name: 'Project One'
    });
    assert.equal(published[0].queue, 'project.created');
    assert.equal(event.data.name, 'Project One');
  } finally {
    rabbitmq.publishEvent = origPublish;
  }
});

test('projectEvents publishProjectUpdated calls rabbitmq', async () => {
  const origPublish = rabbitmq.publishEvent;
  const published = [];
  rabbitmq.publishEvent = async (queue, data) => { published.push({ queue, data }); };

  try {
    const event = await projectEvents.publishProjectUpdated({
      id: 'p-2',
      userId: 'u-2',
      name: 'Project Two'
    });
    assert.equal(published[0].queue, 'project.updated');
    assert.equal(event.data.name, 'Project Two');
  } finally {
    rabbitmq.publishEvent = origPublish;
  }
});
