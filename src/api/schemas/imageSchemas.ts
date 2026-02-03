import { z } from 'zod';
import { imageUrlSchema } from '../../utils/validators';

export const createImageSchema = z.object({
    body: z.object({
        url: imageUrlSchema,
        product_id: z.number().int().positive(),
        display_order: z.number().int().nonnegative(),
    }),
});
