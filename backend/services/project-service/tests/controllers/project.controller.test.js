const test = require('node:test');
const assert = require('node:assert/strict');
const projectController = require('../../src/controllers/project.controller');
const projectService = require('../../src/services/project.service');

test('projectController.listProjects - deve responder com 200 e a lista de projetos', async () => {
  const mockList = projectService.listProjects;
  projectService.listProjects = async () => [{ id: '1', name: 'Projeto Controller' }];

  const req = { headers: { 'x-user-id': 'usr_123' } };
  let statusCode = null;
  let responseBody = null;

  const res = {
    status(code) {
      statusCode = code;
      return {
        json(body) {
          responseBody = body;
        }
      };
    }
  };

  await projectController.listProjects(req, res, () => {});

  assert.equal(statusCode, 200);
  assert.equal(responseBody.projects.length, 1);
  assert.equal(responseBody.projects[0].name, 'Projeto Controller');

  projectService.listProjects = mockList;
});