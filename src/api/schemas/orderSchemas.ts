import { z } from 'zod';
import { OrderStatus } from '../entities/Order';
import { VALIDATION } from '../../constants';

export const createOrderSchema = z.object({
  body: z.object({
    guestName: z
      .string()
      .min(
        VALIDATION.NAME_MIN_LENGTH,
        `Nome deve ter no mínimo ${VALIDATION.NAME_MIN_LENGTH} caracteres`,
      )
      .max(
        VALIDATION.NAME_MAX_LENGTH,
        `Nome deve ter no máximo ${VALIDATION.NAME_MAX_LENGTH} caracteres`,
      )
      .optional(),
    guestEmail: z
      .string()
      .email('Email inválido')
      .max(VALIDATION.EMAIL_MAX_LENGTH, 'Email muito longo')
      .optional(),
    guestCpf: z.string().regex(VALIDATION.CPF_FORMATTED_REGEX, 'CPF inválido').optional(),
    acceptedTerms: z
      .boolean()
      .refine((val) => val === true, 'Você deve aceitar os termos de privacidade para continuar'),
    items: z
      .array(
        z.object({
          productId: z.string().uuid('ID do produto inválido'),
          quantity: z.number().int().positive('Quantidade deve ser um número positivo'),
          size: z.union([
            z.string().min(1, 'Tamanho inválido'),
            z.number().int().positive('Tamanho inválido'),
          ]),
        }),
      )
      .min(1, 'Pedido deve ter pelo menos um item'),
    shippingAddress: z.object({
      street: z
        .string()
        .min(
          VALIDATION.MIN_STREET_LENGTH,
          `Rua deve ter no mínimo ${VALIDATION.MIN_STREET_LENGTH} caracteres`,
        )
        .max(
          VALIDATION.MAX_STREET_LENGTH,
          `Rua deve ter no máximo ${VALIDATION.MAX_STREET_LENGTH} caracteres`,
        ),
      city: z
        .string()
        .min(
          VALIDATION.MIN_CITY_LENGTH,
          `Cidade deve ter no mínimo ${VALIDATION.MIN_CITY_LENGTH} caracteres`,
        )
        .max(
          VALIDATION.MAX_CITY_LENGTH,
          `Cidade deve ter no máximo ${VALIDATION.MAX_CITY_LENGTH} caracteres`,
        ),
      state: z
        .string()
        .length(
          VALIDATION.STATE_LENGTH,
          `Estado deve ter exatamente ${VALIDATION.STATE_LENGTH} caracteres`,
        ),
      zipCode: z.string().regex(VALIDATION.ZIP_CODE_REGEX, 'CEP inválido'),
      country: z
        .string()
        .min(2, 'País deve ter no mínimo 2 caracteres')
        .max(60, 'País deve ter no máximo 60 caracteres'),
    }),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus, {
      message: 'Status inválido. Valores permitidos: ' + Object.values(OrderStatus).join(', '),
    }),
  }),
});
