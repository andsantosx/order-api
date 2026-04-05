import { z } from 'zod';

/**
 * Esquema de validação para o processamento de pagamentos
 * Focado em segurança e integridade dos dados (Clean Architecture)
 */
export const processPaymentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid('ID do pedido deve ser um UUID válido'),
    paymentMethodId: z.string().min(1, 'Método de pagamento é obrigatório'),
    token: z.string().optional(),
    installments: z.number().int().positive().optional(),
    issuerId: z.number().int().optional(),
    deviceId: z.string().optional(),
    payer: z.object({
      email: z.string().email('E-mail do pagador inválido'),
      identification: z.object({
        type: z.string().min(1, 'Tipo de identificação é obrigatório'),
        number: z.string().min(1, 'Número de identificação é obrigatório'),
      }),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
    }),
    // O Brick pode enviar dados adicionais dentro de formData
    formData: z.record(z.string(), z.any()).optional(),
  }),
});
