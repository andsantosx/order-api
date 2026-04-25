import { z } from 'zod';
import { VALIDATION } from '../../constants';
import { imageUrlSchema } from '../../utils/validators';

export const createProductSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(VALIDATION.PRODUCT_NAME_MIN_LENGTH, 'Nome é obrigatório')
        .max(
          VALIDATION.PRODUCT_NAME_MAX_LENGTH,
          `Nome deve ter no máximo ${VALIDATION.PRODUCT_NAME_MAX_LENGTH} caracteres`,
        ),
      price_cents: z
        .preprocess((val) => {
          if (typeof val === 'string') {
            // Remove currency symbols, spaces, and replace comma with dot
            const clean = val.replace(/[R$\s]/g, '').replace(',', '.');
            const parsed = parseFloat(clean);
            return isNaN(parsed) ? undefined : Math.round(parsed * 100);
          }
          return val;
        }, z.number().int().positive('Preço deve ser um número positivo'))
        .optional(),
      priceCents: z
        .preprocess((val) => {
          if (typeof val === 'string') {
            const clean = val.replace(/[R$\s]/g, '').replace(',', '.');
            const parsed = parseFloat(clean);
            return isNaN(parsed) ? undefined : Math.round(parsed * 100);
          }
          return val;
        }, z.number().int().positive('Preço deve ser um número positivo'))
        .optional(),
      description: z
        .string()
        .max(
          VALIDATION.PRODUCT_DESCRIPTION_MAX_LENGTH,
          `Descrição deve ter no máximo ${VALIDATION.PRODUCT_DESCRIPTION_MAX_LENGTH} caracteres`,
        )
        .optional(),
      currency: z.string().length(3, 'Moeda deve ter 3 caracteres (ex: BRL)'),
      categoryId: z.number().int().positive('ID da categoria inválido'),
      brandId: z.number().int().positive('ID da marca inválido').optional(),
      sizeIds: z
        .array(z.number().int().positive())
        .min(1, 'Produto deve ter pelo menos um tamanho'),
      images: z.array(imageUrlSchema).min(1, 'Pelo menos uma imagem é obrigatória').optional(),
      isFeatured: z.boolean().optional(),
    })
    .refine((data) => data.price_cents !== undefined || data.priceCents !== undefined, {
      message: 'Preço é obrigatório (price_cents ou priceCents)',
      path: ['price_cents'],
    }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(VALIDATION.PRODUCT_NAME_MAX_LENGTH).optional(),
    description: z.string().max(VALIDATION.PRODUCT_DESCRIPTION_MAX_LENGTH).optional(),
    price_cents: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          const clean = val.replace(/[R$\s]/g, '').replace(',', '.');
          const parsed = parseFloat(clean);
          return isNaN(parsed) ? undefined : Math.round(parsed * 100);
        }
        return val;
      }, z.number().int().positive().optional())
      .optional(),
    priceCents: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          const clean = val.replace(/[R$\s]/g, '').replace(',', '.');
          const parsed = parseFloat(clean);
          return isNaN(parsed) ? undefined : Math.round(parsed * 100);
        }
        return val;
      }, z.number().int().positive().optional())
      .optional(),
    currency: z.string().length(3).optional(),
    categoryId: z.number().int().positive().optional(),
    brandId: z.number().int().positive().optional(),
    sizeIds: z.array(z.number().int().positive()).min(1).optional(),
    images: z.array(imageUrlSchema).min(1, 'Pelo menos uma imagem é obrigatória').optional(),
    isFeatured: z.boolean().optional(),
  }),
});
