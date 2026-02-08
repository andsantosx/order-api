import { z } from 'zod';

export const createContactSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido'),
    phone: z
      .string()
      .regex(
        /^(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})-?(\d{4}))$/,
        'Número de telefone inválido',
      )
      .optional()
      .or(z.literal('')),
    subject: z.string().min(1, 'Assunto é obrigatório'),
    message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
  }),
});
