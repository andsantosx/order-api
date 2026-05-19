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
    guestCpf: z
      .string()
      .regex(/^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/, 'CPF inválido')
      .optional(),
    phone: z
      .string()
      .min(1, 'Telefone é obrigatório')
      .transform((val) => val.replace(/\D/g, ''))
      .refine(
        (val) => val.length >= 10 && val.length <= 11,
        'Telefone deve ter entre 10 e 11 dígitos com DDD',
      ),
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
          customName: z.string().max(50, 'Nome muito longo').optional(),
          customNumber: z.string().max(10, 'Número muito longo').optional(),
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
      number: z
        .string()
        .min(1, 'Número é obrigatório')
        .regex(/^\d+$/, 'O número deve conter apenas dígitos')
        .max(
          VALIDATION.MAX_ADDRESS_NUMBER_LENGTH,
          `Número deve ter no máximo ${VALIDATION.MAX_ADDRESS_NUMBER_LENGTH} caracteres`,
        ),
      reference: z.string().max(255, 'Ponto de referência muito longo').optional(),
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
        .max(60, 'País deve ter no máximo 60 caracteres')
        .optional()
        .default('Brasil'),
    }),
    idempotencyKey: z.string().uuid().optional(),
    gaClientId: z.string().optional(),
    fbp: z.string().optional(),
    fbc: z.string().optional(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
  }),
});

/**
 * Schema para atualização genérica de status (admin)
 * Inclui campos opcionais de rastreio e notas.
 * O status SHIPPED requer trackingCode — validado no service.
 */
export const updateStatusSchema = z.object({
  body: z.object({
    status: z.number({ error: 'Status é obrigatório ou inválido. Deve ser um número.' }).refine(
      (val) => Object.values(OrderStatus).includes(val as OrderStatus),
      `Status inválido. Valores permitidos: ${Object.values(OrderStatus)
        .filter((v) => typeof v === 'number')
        .join(', ')}`,
    ),
    notes: z.string().max(500, 'Notas muito longas').optional(),
    trackingCode: z.string().min(1).max(100).optional(),
    trackingUrl: z.string().url('URL de rastreio inválida').optional(),
  }),
});

/**
 * Schema dedicado para marcar pedido como enviado (SHIPPED)
 * O código de rastreio é obrigatório.
 */
export const markShippedSchema = z.object({
  body: z.object({
    trackingCode: z
      .string({ error: 'Código de rastreio é obrigatório' })
      .min(1, 'Código de rastreio é obrigatório')
      .max(100, 'Código de rastreio muito longo'),
    trackingUrl: z.string().url('URL de rastreio inválida').optional(),
    notes: z.string().max(500).optional(),
  }),
});

/**
 * Schema para marcar como aguardando envio ou entregue
 */
export const markStatusSchema = z.object({
  body: z.object({
    notes: z.string().max(500).optional(),
  }),
});
