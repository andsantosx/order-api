import { z } from 'zod';

export const createImageSchema = z.object({
    body: z.object({
        url: z.string().url('URL inválida'),
    }),
});
