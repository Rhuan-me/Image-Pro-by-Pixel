const { z } = require("zod");

const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("Informe um e-mail válido.")
      .max(255, "O e-mail deve ter no máximo 255 caracteres.")
      .transform((value) => value.toLowerCase()),

    password: z
      .string()
      .min(1, "A senha é obrigatória.")
      .max(128, "A senha deve ter no máximo 128 caracteres."),
  })
  .strict();

module.exports = { loginSchema };
