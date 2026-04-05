import { z } from 'zod';

/**
 * Esquema de validação para o processamento de pagamentos
 * Focado em segurança e integridade dos dados (Clean Architecture)
 */
export const processPaymentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid('ID do pedido deve ser um UUID válido'),
    // Aceita tanto camelCase quanto snake_case (Padrão do Brick)
    paymentMethodId: z.string().optional(),
    payment_method_id: z.string().optional(),
    token: z.string().optional(),
    installments: z.coerce.number().int().positive().optional(),
    issuerId: z.coerce.number().int().optional(),
    issuer_id: z.union([z.coerce.number().int(), z.string()]).optional(),
    deviceId: z.string().optional(),
    device_id: z.string().optional(),
    payer: z.object({
      email: z.string().email('E-mail do pagador inválido'),
      identification: z.object({
        type: z.string().default('CPF'),
        number: z.string().min(1, 'Número de identificação é obrigatório'),
      }),
      firstName: z.string().optional(),
      first_name: z.string().optional(),
      lastName: z.string().optional(),
      last_name: z.string().optional(),
    }),
    // O Brick pode enviar dados adicionais dentro de formData
    formData: z.record(z.string(), z.any()).optional(),
  }).refine(data => data.paymentMethodId || data.payment_method_id, {
    message: 'Método de pagamento é obrigatório',
    path: ['paymentMethodId'],
  }),
});
