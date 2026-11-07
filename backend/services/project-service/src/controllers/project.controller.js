const projectService = require('../services/project.service');
const { CreateProjectCommand } = require('../commands/createProject.command');
const { ListProjectsQuery } = require('../queries/listProjects.query');
const { GetProjectByIdQuery } = require('../queries/getProjectById.query');
const handlers = require('../handlers');

const getUserId = (req) => req.headers['x-user-id'] || 'usr_anonymous';

exports.createProject = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const project = await handlers.createProject(new CreateProjectCommand({ userId, data: req.body }));

    return res.status(201).json({ message: 'Projeto criado com sucesso.', project });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    return next(error);
  }
};

exports.listProjects = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const projects = await handlers.listProjects(new ListProjectsQuery({ userId }));

    return res.status(200).json({ projects });
  } catch (error) {
    return next(error);
  }
};

exports.getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const project = await handlers.getProjectById(new GetProjectByIdQuery({ id, userId }));

    return res.status(200).json({ project });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    return next(error);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const project = await projectService.getProjectById(id, userId);
    const result = await projectService.deleteProject(project);

    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    return next(error);
  }
};
