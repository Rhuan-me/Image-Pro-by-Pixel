const { z } = require('zod');

const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome do projeto deve ter pelo menos 2 caracteres.')
    .max(100, 'O nome do projeto deve ter no máximo 100 caracteres.'),
  description: z
    .string()
    .trim()
    .max(500, 'A descrição deve ter no máximo 500 caracteres.')
    .optional()
}).strict();

const updateProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome do projeto deve ter pelo menos 2 caracteres.')
    .max(100, 'O nome do projeto deve ter no máximo 100 caracteres.')
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, 'A descrição deve ter no máximo 500 caracteres.')
    .optional()
}).strict();

module.exports = { createProjectSchema, updateProjectSchema };