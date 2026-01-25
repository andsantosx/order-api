import { z } from 'zod';

export const createOrderSchema = z.object({
    body: z.object({
        guestEmail: z.string().email('Email do cliente é obrigatório'),
        items: z.array(
            z.object({
                productId: z.string().uuid('ID do produto inválido'),
                quantity: z.number().int().positive('Quantidade deve ser um número positivo'),
            })
        ).min(1, 'Pedido deve ter pelo menos um item'),
    }),
});
