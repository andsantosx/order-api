import { z } from 'zod';
import { imageUrlSchema } from '../../utils/validators';

export const createProductSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        price_cents: z.number().int().positive('Preço deve ser um número positivo'),
        description: z.string().optional(),
        currency: z.string().length(3, 'Moeda deve ter 3 caracteres (ex: BRL)'),
        categoryId: z.number().int().positive('ID da categoria inválido'),
        sizeIds: z.array(z.number().int().positive()).min(1, 'Produto deve ter pelo menos um tamanho'),
        images: z.array(imageUrlSchema).min(1, 'Pelo menos uma imagem é obrigatória').optional(),
    }),
});

export const updateProductSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        price_cents: z.number().int().positive().optional(),
        currency: z.string().length(3).optional(),
        categoryId: z.number().int().positive().optional(),
        sizeIds: z.array(z.number().int().positive()).min(1).optional(),
        images: z.array(imageUrlSchema).min(1, 'Pelo menos uma imagem é obrigatória').optional(),
    }),
});
