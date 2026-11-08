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