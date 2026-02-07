import { z } from 'zod';
import { VALIDATION, SECURITY } from '../../constants';

/**
 * Schema para registro de novo usuário
 */
export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, 'Nome deve ter no mínimo 3 caracteres')
      .max(
        VALIDATION.MAX_NAME_LENGTH,
        `Nome deve ter no máximo ${VALIDATION.MAX_NAME_LENGTH} caracteres`,
      ),
    email: z
      .string()
      .email('Email inválido')
      .max(VALIDATION.EMAIL_MAX_LENGTH, 'Email muito longo')
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(
        SECURITY.MIN_PASSWORD_LENGTH,
        `Senha deve ter no mínimo ${SECURITY.MIN_PASSWORD_LENGTH} caracteres`,
      )
      .max(
        VALIDATION.PASSWORD_MAX_LENGTH,
        `Senha deve ter no máximo ${VALIDATION.PASSWORD_MAX_LENGTH} caracteres`,
      ),
    document: z
      .string()
      .regex(VALIDATION.CPF_REGEX, 'CPF deve conter apenas 11 dígitos')
      .optional(),
  }),
});

/**
 * Schema para login
 */
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido').toLowerCase().trim(),
    password: z.string().min(1, 'Senha é obrigatória'),
  }),
});

/**
 * Schema para atualização de perfil
 * Todos os campos são opcionais (partial update)
 */
export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(3, 'Nome deve ter no mínimo 3 caracteres')
        .max(
          VALIDATION.MAX_NAME_LENGTH,
          `Nome deve ter no máximo ${VALIDATION.MAX_NAME_LENGTH} caracteres`,
        )
        .optional(),
      document: z
        .string()
        .regex(VALIDATION.CPF_REGEX, 'CPF deve conter apenas 11 dígitos')
        .optional()
        .nullable(),
      password: z
        .string()
        .min(
          SECURITY.MIN_PASSWORD_LENGTH,
          `Senha deve ter no mínimo ${SECURITY.MIN_PASSWORD_LENGTH} caracteres`,
        )
        .max(
          VALIDATION.PASSWORD_MAX_LENGTH,
          `Senha deve ter no máximo ${VALIDATION.PASSWORD_MAX_LENGTH} caracteres`,
        )
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Pelo menos um campo deve ser fornecido para atualização',
    }),
});

/**
 * Schema para criação de endereço
 */
export const createAddressSchema = z.object({
  body: z.object({
    street: z
      .string()
      .min(
        VALIDATION.MIN_STREET_LENGTH,
        `Rua deve ter no mínimo ${VALIDATION.MIN_STREET_LENGTH} caracteres`,
      )
      .max(
        VALIDATION.MAX_ADDRESS_LENGTH,
        `Rua deve ter no máximo ${VALIDATION.MAX_ADDRESS_LENGTH} caracteres`,
      ),
    city: z
      .string()
      .min(
        VALIDATION.MIN_CITY_LENGTH,
        `Cidade deve ter no mínimo ${VALIDATION.MIN_CITY_LENGTH} caracteres`,
      )
      .max(
        VALIDATION.MAX_ADDRESS_LENGTH,
        `Cidade deve ter no máximo ${VALIDATION.MAX_ADDRESS_LENGTH} caracteres`,
      ),
    state: z
      .string()
      .length(
        VALIDATION.STATE_LENGTH,
        `Estado deve ter ${VALIDATION.STATE_LENGTH} caracteres (ex: SP, RJ)`,
      )
      .toUpperCase(),
    zipCode: z
      .string()
      .regex(VALIDATION.ZIP_CODE_REGEX, 'CEP deve estar no formato 12345-678 ou 12345678'),
    country: z
      .string()
      .min(2, 'País deve ter no mínimo 2 caracteres')
      .max(
        VALIDATION.MAX_ADDRESS_LENGTH,
        `País deve ter no máximo ${VALIDATION.MAX_ADDRESS_LENGTH} caracteres`,
      )
      .default('Brasil'),
  }),
});
