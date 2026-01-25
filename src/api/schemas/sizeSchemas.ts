import { z } from 'zod';

export const createSizeSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        type: z.enum(['clothing', 'shoes'], { message: 'Tipo deve ser clothing ou shoes' }),
    }),
});
