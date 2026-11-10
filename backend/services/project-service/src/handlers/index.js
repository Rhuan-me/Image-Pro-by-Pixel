const Project = require('../models/Project');
const projectService = require('../services/project.service');
const { createProjectSchema, updateProjectSchema } = require('../schemas/project.schemas');
const { publishProjectCreated, publishProjectUpdated } = require('../events/projectEvents');
const { createCreateProjectHandler } = require('./createProject.handler');
const { createUpdateProjectHandler } = require('./updateProject.handler');
const { createListProjectsHandler } = require('./listProjects.handler');
const { createGetProjectByIdHandler } = require('./getProjectById.handler');

const projectRepository = {
  create: (data) => Project.create(data),
  list: (userId) => projectService.listProjects(userId),
  getById: (id, userId) => projectService.getProjectById(id, userId)
};

const createProject = createCreateProjectHandler({
  projectRepository,
  validate: createProjectSchema,
  publishProjectCreated
});

const updateProject = createUpdateProjectHandler({
  projectRepository,
  validate: updateProjectSchema,
  publishProjectUpdated
});

const listProjects = createListProjectsHandler({ projectRepository });
const getProjectById = createGetProjectByIdHandler({ projectRepository });

module.exports = { createProject, updateProject, listProjects, getProjectById };
