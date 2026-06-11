import { z } from 'zod';

export const syncCartSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Product ID inválido'),
          size: z.string().min(1, 'Tamanho é obrigatório').max(10, 'Tamanho muito longo'),
          quantity: z.number().int().min(1, 'Quantidade mínima é 1'),
          customName: z.string().max(12, 'Nome personalizado muito longo').optional().nullable(),
          customNumber: z.string().max(2, 'Número personalizado muito longo').optional().nullable(),
        })
      )
      .default([]),
  }),
});
