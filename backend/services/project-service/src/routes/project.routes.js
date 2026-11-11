const { Router } = require('express');

const {
  createProject,
  listProjects,
  getProjectById,
  deleteProject,
  addImageToProject
} = require('../controllers/project.controller');

const router = Router();

router.post('/', createProject);
router.get('/', listProjects);
router.get('/:id', getProjectById);
router.delete('/:id', deleteProject);

router.post('/:id/images', addImageToProject);

module.exports = router;