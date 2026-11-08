const test = require('node:test');
const assert = require('node:assert/strict');
const projectService = require('../../src/services/project.service');
const Project = require('../../src/models/Project');

test('projectService.listProjects - deve retornar lista de projetos do usuário', async () => {
  const mockFindAll = Project.findAll;
  Project.findAll = async (options) => {
    assert.equal(options.where.userId, 'usr_123');
    return [{ id: '1', name: 'Proj 1', userId: 'usr_123' }];
  };

  const projects = await projectService.listProjects('usr_123');
  assert.equal(projects.length, 1);
  assert.equal(projects[0].name, 'Proj 1');

  Project.findAll = mockFindAll;
});

test('projectService.getProjectById - deve lançar erro 404 se o projeto não existir', async () => {
  const mockFindOne = Project.findOne;
  Project.findOne = async () => null;

  await assert.rejects(async () => {
    await projectService.getProjectById('uuid-inexistente', 'usr_123');
  }, (err) => {
    assert.equal(err.status, 404);
    assert.equal(err.code, 'NOT_FOUND');
    return true;
  });

  Project.findOne = mockFindOne;
});

test('projectService.createProject - deve validar e criar projeto', async () => {
  await assert.rejects(async () => {
    await projectService.createProject('usr_123', { name: 'A' });
  }, (err) => {
    assert.equal(err.status, 400);
    assert.equal(err.code, 'VALIDATION_ERROR');
    return true;
  });

  const mockCreate = Project.create;
  Project.create = async (data) => ({ id: 'p1', ...data });
  const proj = await projectService.createProject('usr_123', { name: 'Projeto Novo' });
  assert.equal(proj.id, 'p1');
  assert.equal(proj.name, 'Projeto Novo');
  Project.create = mockCreate;
});

test('projectService.getProjectById - deve retornar projeto se existir', async () => {
  const mockFindOne = Project.findOne;
  Project.findOne = async () => ({ id: 'p1', name: 'Projeto 1' });
  const proj = await projectService.getProjectById('p1', 'usr_123');
  assert.equal(proj.id, 'p1');
  Project.findOne = mockFindOne;
});

test('projectService.deleteProject - deve destruir instância e retornar mensagem', async () => {
  let destroyed = false;
  const mockInstance = {
    destroy: async () => { destroyed = true; }
  };
  const res = await projectService.deleteProject(mockInstance);
  assert.equal(destroyed, true);
  assert.equal(res.message, 'Projeto excluído com sucesso.');
});
