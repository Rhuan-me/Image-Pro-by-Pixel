const { z } = require('zod');

const updateProfileSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Informe um e-mail válido.')
    .max(255, 'O e-mail deve ter no máximo 255 caracteres.')
    .transform(value => value.toLowerCase())
}).strict();

module.exports = { updateProfileSchema };