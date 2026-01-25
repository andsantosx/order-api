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
        shippingAddress: z.object({
            street: z.string().min(1, 'Rua é obrigatória'),
            city: z.string().min(1, 'Cidade é obrigatória'),
            state: z.string().min(1, 'Estado é obrigatório'),
            zipCode: z.string().min(1, 'CEP é obrigatório'),
            country: z.string().min(1, 'País é obrigatório'),
        }),
    }),
});
