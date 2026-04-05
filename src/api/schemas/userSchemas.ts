import { z } from 'zod';
import { VALIDATION, SECURITY } from '../../constants';
import { isValidCPF, normalizePhone } from '../../utils/validation';

/**
 * Schema para registro de novo usuário
 */
export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(
        VALIDATION.NAME_MIN_LENGTH,
        `Nome deve ter no mínimo ${VALIDATION.NAME_MIN_LENGTH} caracteres`,
      )
      .max(
        VALIDATION.NAME_MAX_LENGTH,
        `Nome deve ter no máximo ${VALIDATION.NAME_MAX_LENGTH} caracteres`,
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
      .transform((val) => val.replace(/\D/g, ''))
      .refine((val) => val.length === 11, 'CPF deve conter exatamente 11 dígitos')
      .refine((val) => isValidCPF(val), 'CPF inválido')
      .optional(),
    phone: z
      .string()
      .transform((val) => val.replace(/\D/g, ''))
      .refine(
        (val) => val.length >= 10 && val.length <= 11,
        'Telefone deve ter entre 10 e 11 dígitos (com DDD)',
      ),
    acceptedTerms: z
      .boolean()
      .refine((val) => val === true, 'Você deve aceitar os termos de privacidade para continuar'),
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
      phone: z
        .string()
        .transform((val) => val.replace(/\D/g, ''))
        .refine(
          (val) => val.length >= 10 && val.length <= 11,
          'Telefone deve ter entre 10 e 11 dígitos (com DDD)',
        )
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Pelo menos um campo deve ser fornecido para atualização',
    }),
});
