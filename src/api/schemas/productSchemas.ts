import { z } from 'zod';

export const createProductSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        price_cents: z.number().int().positive('Price must be a positive integer'),
        currency: z.string().length(3, 'Currency must be 3 characters (e.g., BRL)'),
        categoryId: z.string().uuid('Invalid category ID'),
    }),
});

export const updateProductSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        price_cents: z.number().int().positive().optional(),
        currency: z.string().length(3).optional(),
        categoryId: z.string().uuid().optional(),
    }),
});
