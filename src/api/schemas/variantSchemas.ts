import { z } from 'zod';

export const createVariantSchema = z.object({
    body: z.object({
        sizeId: z.string().uuid('Invalid size ID'),
        stock: z.number().int().min(0, 'Stock must be a non-negative integer'),
        price_cents: z.number().int().positive().optional(),
    }),
});

export const updateVariantSchema = z.object({
    body: z.object({
        sizeId: z.string().uuid().optional(),
        stock: z.number().int().min(0).optional(),
        price_cents: z.number().int().positive().nullable().optional(),
    }),
});

export const updateStockSchema = z.object({
    body: z.object({
        stock: z.number().int().min(0, 'Stock must be a non-negative integer'),
    }),
});
