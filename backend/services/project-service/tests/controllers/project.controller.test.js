const test = require('node:test');
const assert = require('node:assert/strict');
const projectController = require('../../src/controllers/project.controller');
const handlers = require('../../src/handlers');

test('projectController.listProjects - deve responder com 200 e a lista de projetos', async () => {
  const origList = handlers.listProjects;
  handlers.listProjects = async () => [{ id: '1', name: 'Projeto Controller' }];

  const req = { headers: { 'x-user-id': 'usr_123' } };
  let statusCode = null;
  let responseBody = null;

  const res = {
    status(code) {
      statusCode = code;
      return {
        json(body) { responseBody = body; }
      };
    }
  };

  await projectController.listProjects(req, res, () => {});
  assert.equal(statusCode, 200);
  assert.equal(responseBody.projects.length, 1);
  assert.equal(responseBody.projects[0].name, 'Projeto Controller');

  // Error case
  let nextErr = null;
  handlers.listProjects = async () => { throw new Error('fail'); };
  await projectController.listProjects(req, res, (e) => { nextErr = e; });
  assert.ok(nextErr);

  handlers.listProjects = origList;
});

test('projectController.createProject - deve responder com 201 ou tratar erro', async () => {
  const origCreate = handlers.createProject;
  handlers.createProject = async () => ({ id: 'p1', name: 'Novo Proj' });

  const req = { headers: { 'x-user-id': 'usr_123' }, body: { name: 'Novo Proj' } };
  let statusCode = null;
  let responseBody = null;
  const res = {
    status(code) {
      statusCode = code;
      return {
        json(body) { responseBody = body; }
      };
    }
  };

  await projectController.createProject(req, res, () => {});
  assert.equal(statusCode, 201);
  assert.equal(responseBody.project.name, 'Novo Proj');

  // Error with status
  const errWithStatus = new Error('Validation failed');
  errWithStatus.status = 400;
  errWithStatus.code = 'VALIDATION_ERROR';
  handlers.createProject = async () => { throw errWithStatus; };
  await projectController.createProject(req, res, () => {});
  assert.equal(statusCode, 400);

  // Unhandled error
  let nextErr = null;
  handlers.createProject = async () => { throw new Error('db crashed'); };
  await projectController.createProject(req, res, (e) => { nextErr = e; });
  assert.ok(nextErr);

  handlers.createProject = origCreate;
});

test('projectController.getProjectById - deve responder com 200 ou tratar erro', async () => {
  const origGet = handlers.getProjectById;
  handlers.getProjectById = async () => ({ id: 'p1', name: 'Projeto X' });

  const req = { headers: {}, params: { id: 'p1' } };
  let statusCode = null;
  let responseBody = null;
  const res = {
    status(code) {
      statusCode = code;
      return {
        json(body) { responseBody = body; }
      };
    }
  };

  await projectController.getProjectById(req, res, () => {});
  assert.equal(statusCode, 200);
  assert.equal(responseBody.project.id, 'p1');

  // Error with status
  const notFoundErr = new Error('Not found');
  notFoundErr.status = 404;
  notFoundErr.code = 'NOT_FOUND';
  handlers.getProjectById = async () => { throw notFoundErr; };
  await projectController.getProjectById(req, res, () => {});
  assert.equal(statusCode, 404);

  // Unhandled error
  let nextErr = null;
  handlers.getProjectById = async () => { throw new Error('boom'); };
  await projectController.getProjectById(req, res, (e) => { nextErr = e; });
  assert.ok(nextErr);

  handlers.getProjectById = origGet;
});

test('projectController.deleteProject - deve responder com 200 ou tratar erro', async () => {
  const origDelete = handlers.deleteProject;
  handlers.deleteProject = async () => ({ message: 'Projeto excluído com sucesso.' });

  const req = { headers: {}, params: { id: 'p1' } };
  let statusCode = null;
  let responseBody = null;
  const res = {
    status(code) {
      statusCode = code;
      return {
        json(body) { responseBody = body; }
      };
    }
  };

  await projectController.deleteProject(req, res, () => {});
  assert.equal(statusCode, 200);
  assert.equal(responseBody.message, 'Projeto excluído com sucesso.');

  // Error with status
  const notFoundErr = new Error('Not found');
  notFoundErr.status = 404;
  notFoundErr.code = 'NOT_FOUND';
  handlers.deleteProject = async () => { throw notFoundErr; };
  await projectController.deleteProject(req, res, () => {});
  assert.equal(statusCode, 404);

  // Unhandled error
  let nextErr = null;
  handlers.deleteProject = async () => { throw new Error('boom'); };
  await projectController.deleteProject(req, res, (e) => { nextErr = e; });
  assert.ok(nextErr);

  handlers.deleteProject = origDelete;
});

test('projectController.addImageToProject - deve responder com 201 ou tratar erro', async () => {
  const origAddImage = handlers.addImageToProject;
  handlers.addImageToProject = async () => ({ id: 'link_1', projectId: 'p1', imageId: 'img_123' });

  const req = { headers: {}, params: { id: 'p1' }, body: { imageId: 'img_123' } };
  let statusCode = null;
  let responseBody = null;
  const res = {
    status(code) {
      statusCode = code;
      return {
        json(body) { responseBody = body; }
      };
    }
  };

  await projectController.addImageToProject(req, res, () => {});
  assert.equal(statusCode, 201);
  assert.equal(responseBody.data.imageId, 'img_123');

  // Error with status (ex: 400 Validation Error)
  const validationErr = new Error('Validation failed');
  validationErr.status = 400;
  validationErr.code = 'VALIDATION_ERROR';
  handlers.addImageToProject = async () => { throw validationErr; };
  await projectController.addImageToProject(req, res, () => {});
  assert.equal(statusCode, 400);

  // Unhandled error
  let nextErr = null;
  handlers.addImageToProject = async () => { throw new Error('db error'); };
  await projectController.addImageToProject(req, res, (e) => { nextErr = e; });
  assert.ok(nextErr);

  handlers.addImageToProject = origAddImage;
});