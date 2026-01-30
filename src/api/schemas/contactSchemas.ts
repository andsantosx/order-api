import { z } from 'zod';

export const createContactSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        email: z.string().email('Email inválido'),
        phone: z.string().optional(),
        subject: z.string().min(1, 'Assunto é obrigatório'),
        message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
    }),
});
