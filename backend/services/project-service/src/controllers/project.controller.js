const { CreateProjectCommand } = require('../commands/createProject.command');
const { DeleteProjectCommand } = require('../commands/deleteProject.command');
const { AddImageToProjectCommand } = require('../commands/addImageToProject.command');
const { RemoveImageFromProjectCommand } = require('../commands/removeImageFromProject.command');

const { ListProjectsQuery } = require('../queries/listProjects.query');
const { GetProjectByIdQuery } = require('../queries/getProjectById.query');
const { ListProjectImagesQuery } = require('../queries/listProjectImages.query');

const handlers = require('../handlers');

const getUserId = (req) => req.headers['x-user-id'] || 'usr_anonymous';

exports.createProject = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const project = await handlers.createProject(new CreateProjectCommand({ userId, data: req.body }));

    return res.status(201).json({ message: 'Projeto criado com sucesso.', project });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: { code: error.code, message: error.details || error.message } });
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
    const result = await handlers.deleteProject(new DeleteProjectCommand({ id, userId }));
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    return next(error);
  }
};

exports.addImageToProject = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const userId = getUserId(req);

    console.log("projectId:", projectId, "userId:", userId, "body:", req.body)
    const imageProject = await handlers.addImageToProject(
      new AddImageToProjectCommand({ projectId, userId, body: req.body })
    );

    return res.status(201).json({
      message: 'Imagem adicionada ao projeto com sucesso.',
      data: imageProject
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: { code: error.code, message: error.details || error.message } });
    }
    return next(error);
  }
};

exports.listProjectImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const images = await handlers.listProjectImages(new ListProjectImagesQuery({ id, userId }));

    return res.status(200).json({ images });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    return next(error);
  }
};

exports.removeImageFromProject = async (req, res, next) => {
  try {
    const { id: projectId, imageId } = req.params;
    const userId = getUserId(req);

    const result = await handlers.removeImageFromProject(
      new RemoveImageFromProjectCommand({ projectId, imageId, userId })
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    return next(error);
  }
};

