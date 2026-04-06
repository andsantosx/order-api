import { z } from 'zod';

export const createBrandSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    slug: z
      .string()
      .min(1, 'Slug é obrigatório')
      .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  }),
});

export const updateBrandSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome não pode ser vazio').optional(),
    slug: z
      .string()
      .min(1, 'Slug não pode ser vazio')
      .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens')
      .optional(),
  }),
});
