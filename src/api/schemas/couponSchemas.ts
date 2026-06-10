import { z } from 'zod';

export const createCouponSchema = z.object({
  body: z.object({
    code: z
      .string()
      .min(3, 'Código deve ter no mínimo 3 caracteres')
      .max(20, 'Código deve ter no máximo 20 caracteres')
      .trim()
      .regex(/^[a-zA-Z0-9]+$/, 'Código deve conter apenas letras e números')
      .transform((val) => val.toUpperCase()),
    discountPercentage: z
      .number({ message: 'Porcentagem de desconto é obrigatória' })
      .int('Porcentagem deve ser um número inteiro')
      .min(1, 'Porcentagem mínima é 1%')
      .max(100, 'Porcentagem máxima é 100%'),
    maxUsesPerUser: z
      .number({ message: 'Quantidade máxima de usos por usuário é obrigatória' })
      .int('Quantidade deve ser um número inteiro')
      .positive('Quantidade deve ser maior que zero'),
    maxUsesGlobal: z
      .number()
      .int('Quantidade deve ser um número inteiro')
      .positive('Quantidade deve ser maior que zero')
      .or(z.null())
      .optional(),
    minOrderValueCents: z
      .number()
      .int('Valor deve ser um número inteiro em centavos')
      .nonnegative('Valor deve ser maior ou igual a zero')
      .or(z.null())
      .optional(),
    maxDiscountCents: z
      .number()
      .int('Valor deve ser um número inteiro em centavos')
      .nonnegative('Valor deve ser maior ou igual a zero')
      .or(z.null())
      .optional(),
    firstOrderOnly: z.boolean().optional(),
    minItems: z
      .number()
      .int('Quantidade de itens deve ser um número inteiro')
      .min(1, 'O mínimo de itens deve ser pelo menos 1')
      .optional(),
    isActive: z.boolean().optional(),
    expiresAt: z
      .string()
      .datetime({ message: 'Data de expiração deve ser uma data/hora ISO 8601 válida' })
      .transform((val) => new Date(val))
      .or(z.null())
      .optional(),
  }),
});

export const updateCouponSchema = z.object({
  body: z.object({
    code: z
      .string()
      .min(3, 'Código deve ter no mínimo 3 caracteres')
      .max(20, 'Código deve ter no máximo 20 caracteres')
      .trim()
      .regex(/^[a-zA-Z0-9]+$/, 'Código deve conter apenas letras e números')
      .transform((val) => val.toUpperCase())
      .optional(),
    discountPercentage: z
      .number()
      .int('Porcentagem deve ser um número inteiro')
      .min(1, 'Porcentagem mínima é 1%')
      .max(100, 'Porcentagem máxima é 100%')
      .optional(),
    maxUsesPerUser: z
      .number()
      .int('Quantidade deve ser um número inteiro')
      .positive('Quantidade deve ser maior que zero')
      .optional(),
    maxUsesGlobal: z
      .number()
      .int('Quantidade deve ser um número inteiro')
      .positive('Quantidade deve ser maior que zero')
      .or(z.null())
      .optional(),
    minOrderValueCents: z
      .number()
      .int('Valor deve ser um número inteiro em centavos')
      .nonnegative('Valor deve ser maior ou igual a zero')
      .or(z.null())
      .optional(),
    maxDiscountCents: z
      .number()
      .int('Valor deve ser um número inteiro em centavos')
      .nonnegative('Valor deve ser maior ou igual a zero')
      .or(z.null())
      .optional(),
    firstOrderOnly: z.boolean().optional(),
    minItems: z
      .number()
      .int('Quantidade de itens deve ser um número inteiro')
      .min(1, 'O mínimo de itens deve ser pelo menos 1')
      .optional(),
    isActive: z.boolean().optional(),
    expiresAt: z
      .string()
      .datetime({ message: 'Data de expiração deve ser uma data/hora ISO 8601 válida' })
      .transform((val) => new Date(val))
      .or(z.null())
      .optional(),
  }),
});

export const validateCouponSchema = z.object({
  query: z.object({
    code: z
      .string()
      .min(1, 'Código é obrigatório')
      .trim(),
    itemCount: z
      .string()
      .min(1, 'Quantidade de itens é obrigatória')
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val >= 1, 'Quantidade de itens deve ser um número válido'),
    subtotalCents: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine((val) => val === undefined || (!isNaN(val) && val >= 0), 'Subtotal deve ser um número válido em centavos'),
  }),
});
