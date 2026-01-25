import { z } from 'zod';

export const createVariantSchema = z.object({
    body: z.object({
        sizeId: z.number().int().positive('ID do tamanho inválido'),
        stock: z.number().int().min(0, 'Estoque deve ser um número não negativo'),
        price_cents: z.number().int().positive().optional(),
    }),
});

export const updateVariantSchema = z.object({
    body: z.object({
        sizeId: z.number().int().positive().optional(),
        stock: z.number().int().min(0).optional(),
        price_cents: z.number().int().positive().nullable().optional(),
    }),
});

export const updateStockSchema = z.object({
    body: z.object({
        stock: z.number().int().min(0, 'Estoque deve ser um número não negativo'),
    }),
});
