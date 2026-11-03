const Project = require('../models/Project');
const { createProjectSchema, updateProjectSchema } = require('../schemas/projectSchema');

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

exports.createProject = async (userId, body) => {
  const validation = createProjectSchema.safeParse(body);
  if (!validation.success) {
    throw createError(400, 'VALIDATION_ERROR', validation.error.format());
  }

  const { name, description } = validation.data;
  const project = await Project.create({ userId, name, description });
  return project;
};

exports.listProjects = async (userId) => {
  const projects = await Project.findAll({ where: { userId } });
  return projects;
};

exports.getProjectById = async (id, userId) => {
  const project = await Project.findOne({ where: { id, userId } });
  if (!project) {
    throw createError(404, 'NOT_FOUND', 'Projeto não encontrado.');
  }
  return project;
};

exports.deleteProject = async (projectInstance) => {
  await projectInstance.destroy();
  return { message: 'Projeto excluído com sucesso.' };
};