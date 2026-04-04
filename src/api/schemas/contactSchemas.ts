import { z } from 'zod';
import { VALIDATION } from '../../constants';
import { normalizePhone } from '../../utils/validation';

export const createContactSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(VALIDATION.NAME_MIN_LENGTH, `Nome deve ter no mínimo ${VALIDATION.NAME_MIN_LENGTH} caracteres`)
      .max(VALIDATION.NAME_MAX_LENGTH, `Nome deve ter no máximo ${VALIDATION.NAME_MAX_LENGTH} caracteres`),
    email: z.string().email('Email inválido').max(VALIDATION.EMAIL_MAX_LENGTH, 'Email muito longo'),
    phone: z
      .string()
      .transform((val) => normalizePhone(val))
      .refine((val) => val.length === 10 || val.length === 11, 'Telefone deve ter 10 ou 11 dígitos')
      .optional()
      .or(z.literal('')),
    subject: z
      .string()
      .min(VALIDATION.SUBJECT_MIN_LENGTH, `Assunto deve ter no mínimo ${VALIDATION.SUBJECT_MIN_LENGTH} caracteres`)
      .max(VALIDATION.SUBJECT_MAX_LENGTH, `Assunto deve ter no máximo ${VALIDATION.SUBJECT_MAX_LENGTH} caracteres`),
    message: z
      .string()
      .min(VALIDATION.MESSAGE_MIN_LENGTH, `Mensagem deve ter no mínimo ${VALIDATION.MESSAGE_MIN_LENGTH} caracteres`)
      .max(VALIDATION.MESSAGE_MAX_LENGTH, `Mensagem deve ter no máximo ${VALIDATION.MESSAGE_MAX_LENGTH} caracteres`),
  }),
});
