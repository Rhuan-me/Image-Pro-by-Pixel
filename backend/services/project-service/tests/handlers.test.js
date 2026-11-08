const test = require('node:test');
const assert = require('node:assert/strict');
const { CreateProjectCommand } = require('../src/commands/createProject.command');
const { UpdateProjectCommand } = require('../src/commands/updateProject.command');
const { ListProjectsQuery } = require('../src/queries/listProjects.query');
const { GetProjectByIdQuery } = require('../src/queries/getProjectById.query');
const { createCreateProjectHandler } = require('../src/handlers/createProject.handler');
const { createUpdateProjectHandler } = require('../src/handlers/updateProject.handler');
const { createListProjectsHandler } = require('../src/handlers/listProjects.handler');
const { createGetProjectByIdHandler } = require('../src/handlers/getProjectById.handler');

const validCreate = { safeParse: (data) => ({ success: true, data }) };

test('CreateProjectHandler publica ProjectCreated depois de criar o projeto', async () => {
  const published = [];
  const handler = createCreateProjectHandler({
    projectRepository: { create: async (data) => ({ id: 'prj_1', ...data }) },
    validate: validCreate,
    publishProjectCreated: async (project) => published.push(project)
  });

  const project = await handler(new CreateProjectCommand({
    userId: 'usr_1',
    data: { name: 'PixPro', description: 'Projeto' }
  }));

  assert.equal(project.id, 'prj_1');
  assert.equal(published.length, 1);
  assert.equal(published[0].name, 'PixPro');
});

test('UpdateProjectHandler publica ProjectUpdated depois de atualizar o projeto', async () => {
  const published = [];
  const project = {
    id: 'prj_1',
    userId: 'usr_1',
    name: 'Antes',
    async update(data) {
      Object.assign(this, data);
    }
  };
  const handler = createUpdateProjectHandler({
    projectRepository: { getById: async () => project },
    validate: validCreate,
    publishProjectUpdated: async (updated) => published.push(updated)
  });

  await handler(new UpdateProjectCommand({
    id: 'prj_1',
    userId: 'usr_1',
    data: { name: 'Depois' }
  }));

  assert.equal(project.name, 'Depois');
  assert.equal(published.length, 1);
});

test('UpdateProjectHandler mantém o erro para projeto inexistente', async () => {
  const notFound = Object.assign(new Error('Projeto não encontrado.'), {
    status: 404,
    code: 'NOT_FOUND'
  });
  const handler = createUpdateProjectHandler({
    projectRepository: { getById: async () => { throw notFound; } },
    validate: validCreate,
    publishProjectUpdated: async () => assert.fail('não deve publicar evento')
  });

  await assert.rejects(
    handler(new UpdateProjectCommand({ id: 'inexistente', userId: 'usr_1', data: { name: 'Novo' } })),
    (error) => error === notFound
  );
});

test('falha ao publicar evento não derruba comandos de projeto', async () => {
  const project = {
    id: 'prj_1',
    userId: 'usr_1',
    name: 'Projeto',
    async update() {}
  };
  const createHandler = createCreateProjectHandler({
    projectRepository: { create: async () => project },
    validate: validCreate,
    publishProjectCreated: async () => { throw new Error('broker fora'); }
  });
  const updateHandler = createUpdateProjectHandler({
    projectRepository: { getById: async () => project },
    validate: validCreate,
    publishProjectUpdated: async () => { throw new Error('broker fora'); }
  });

  assert.equal((await createHandler(new CreateProjectCommand({ userId: 'usr_1', data: {} }))).id, 'prj_1');
  assert.equal((await updateHandler(new UpdateProjectCommand({ id: 'prj_1', userId: 'usr_1', data: {} }))).id, 'prj_1');
});

test('queries de projeto apenas leem e não publicam eventos', async () => {
  let writes = 0;
  const repository = {
    list: async () => [{ id: 'prj_1' }],
    getById: async () => ({ id: 'prj_1' }),
    create: async () => { writes += 1; },
    update: async () => { writes += 1; }
  };
  const list = createListProjectsHandler({ projectRepository: repository });
  const getById = createGetProjectByIdHandler({ projectRepository: repository });

  assert.equal((await list(new ListProjectsQuery({ userId: 'usr_1' }))).length, 1);
  assert.equal((await getById(new GetProjectByIdQuery({ id: 'prj_1', userId: 'usr_1' }))).id, 'prj_1');
  assert.equal(writes, 0);
});

test('CreateProjectHandler mantém detalhes de validação no erro', async () => {
  const details = { name: { _errors: ['O nome do projeto deve ter pelo menos 2 caracteres.'] } };
  const handler = createCreateProjectHandler({
    projectRepository: { create: async () => assert.fail('não deve criar projeto') },
    validate: { safeParse: () => ({ success: false, error: { format: () => details } }) },
    publishProjectCreated: async () => assert.fail('não deve publicar evento')
  });

  await assert.rejects(
    handler(new CreateProjectCommand({ userId: 'usr_1', data: { name: 'x' } })),
    (error) => error.status === 400 && error.code === 'VALIDATION_ERROR' && error.details === details
  );
});
