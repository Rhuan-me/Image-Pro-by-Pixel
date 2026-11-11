const Project = require('../models/Project');
const projectService = require('../services/project.service');
const { createProjectSchema, updateProjectSchema, addImageToProjectSchema} = require('../schemas/project.schemas');
const { publishProjectCreated, publishProjectUpdated } = require('../events/projectEvents');
const { createCreateProjectHandler } = require('./createProject.handler');
const { createUpdateProjectHandler } = require('./updateProject.handler');
const { createListProjectsHandler } = require('./listProjects.handler');
const { createAddImageToProjectHandler } = require('./postImage.handler');
const { createDeleteProjectHandler } = require('./deleteProject.handler');
const { createGetProjectByIdHandler } = require('./getProjectById.handler');

const ImageProject = require('../models/imageProject');

const projectRepository = {
  create: (data) => Project.create(data),
  list: (userId) => projectService.listProjects(userId),
  getById: (id, userId) => projectService.getProjectById(id, userId),
  addImage: (projectId, data) => ImageProject.create({
    projectId: projectId,
    imageId: data.imageId,
    metadata: data.metadata
  })
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
const deleteProject = createDeleteProjectHandler({ projectRepository });
const getProjectById = createGetProjectByIdHandler({ projectRepository });

const addImageToProject = createAddImageToProjectHandler({
  projectRepository,
  validate: addImageToProjectSchema
});

module.exports = { createProject, updateProject, listProjects, getProjectById, addImageToProject, deleteProject};
