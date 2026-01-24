import { z } from 'zod';

export const createProductSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        description: z.string().optional(),
        price_cents: z.number().int().positive('Price must be a positive integer'),
        stock: z.number().int().nonnegative('Stock cannot be negative'),
    }),
});
