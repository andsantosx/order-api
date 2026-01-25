import { z } from 'zod';

export const createProductSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        price_cents: z.number().int().positive('Preço deve ser um número positivo'),
        currency: z.string().length(3, 'Moeda deve ter 3 caracteres (ex: BRL)'),
        categoryId: z.number().int().positive('ID da categoria inválido'),
        sizeId: z.number().int().positive('ID do tamanho inválido'),
    }),
});

export const updateProductSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        price_cents: z.number().int().positive().optional(),
        currency: z.string().length(3).optional(),
        categoryId: z.number().int().positive().optional(),
        sizeId: z.number().int().positive().optional(),
    }),
});
