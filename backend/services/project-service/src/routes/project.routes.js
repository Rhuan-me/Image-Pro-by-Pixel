const { Router } = require('express');

const {
  createProject,
  listProjects,
  getProjectById,
  deleteProject
} = require('../controllers/project.controller');

const router = Router();

router.post('/', createProject);
router.get('/', listProjects);
router.get('/:id', getProjectById);
router.delete('/:id', deleteProject);

module.exports = router;