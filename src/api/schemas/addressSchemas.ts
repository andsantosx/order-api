import { z } from 'zod';
import { VALIDATION } from '../../constants';

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
        `Estado deve ter ${VALIDATION.STATE_LENGTH} caracteres (ex: SP, RJ)`,
      )
      .toUpperCase(),
    zipCode: z
      .string()
      .regex(VALIDATION.ZIP_CODE_REGEX, 'CEP deve estar no formato 12345-678 ou 12345678'),
    country: z
      .string()
      .min(2, 'País deve ter no mínimo 2 caracteres')
      .max(60, 'País deve ter no máximo 60 caracteres')
      .default('Brasil'),
  }),
});
