import { z } from 'zod';

export const createOrderSchema = z.object({
    body: z.object({
        guestEmail: z.string().email('Guest email is required'),
        items: z.array(
            z.object({
                productId: z.string().uuid(),
                variantId: z.string().uuid(),
                quantity: z.number().int().positive(),
            })
        ).min(1, 'Order must have at least one item'),
    }),
});
