
const { z } = require('zod');

const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Informe um e-mail válido.')
    .max(255, 'O e-mail deve ter no máximo 255 caracteres.')
    .transform(value => value.toLowerCase()),

  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .max(128, 'A senha deve ter no máximo 128 caracteres.')
    .regex(/[a-z]/, 'A senha deve conter uma letra minúscula.')
    .regex(/[A-Z]/, 'A senha deve conter uma letra maiúscula.')
    .regex(/[0-9]/, 'A senha deve conter um número.')
    .regex(/[^A-Za-z0-9]/, 'A senha deve conter um caractere especial.')
}).strict();

module.exports = { registerSchema };
