import { validateImageUrl as isValidImageUrl } from './validators';
import { VALIDATION } from '../constants';

/**
 * Remove tags HTML e scripts maliciosos de uma string
 * Previne ataques XSS (Cross-Site Scripting)
 */
function stripHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Trunca uma string para um comprimento máximo
 */
function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }
  return input.substring(0, maxLength);
}

/**
 * Normaliza espaços em branco em uma string
 * Remove espaços duplicados e trim
 */
function normalizeSpaces(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

/**
 * Sanitiza dados de usuário
 */
export function sanitizeUserData(data: { name?: string; email?: string; document?: string; phone?: string }): {
  name?: string;
  email?: string;
  document?: string;
  phone?: string;
} {
  const sanitized: {
    name?: string;
    email?: string;
    document?: string;
    phone?: string;
  } = {};

  if (data.name !== undefined) {
    sanitized.name = truncate(normalizeSpaces(stripHtml(data.name)), VALIDATION.MAX_NAME_LENGTH);
  }

  if (data.email !== undefined) {
    sanitized.email = data.email.toLowerCase().trim();
  }

  if (data.document !== undefined) {
    sanitized.document = data.document.replace(/\D/g, '');
  }

  if (data.phone !== undefined) {
    sanitized.phone = data.phone.replace(/\D/g, '');
  }

  return sanitized;
}

/**
 * Sanitiza dados de produto
 */
export function sanitizeProductData(data: {
  name?: string;
  description?: string;
  images?: string[];
}): {
  name?: string;
  description?: string;
  images?: string[];
} {
  const sanitized: {
    name?: string;
    description?: string;
    images?: string[];
  } = {};

  if (data.name !== undefined) {
    sanitized.name = truncate(normalizeSpaces(stripHtml(data.name)), VALIDATION.MAX_NAME_LENGTH);
  }

  if (data.description !== undefined) {
    sanitized.description = truncate(
      normalizeSpaces(stripHtml(data.description)),
      VALIDATION.MAX_DESCRIPTION_LENGTH,
    );
  }

  if (data.images !== undefined) {
    // Valida e sanitiza URLs de imagens usando a lógica centralizada de validators.ts
    sanitized.images = data.images.map((url) => url.trim()).filter((url) => isValidImageUrl(url));
  }

  return sanitized;
}

/**
 * Sanitiza dados de endereço
 */
export function sanitizeAddressData(data: {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}): {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
} {
  const sanitized: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  } = {};

  if (data.street !== undefined) {
    sanitized.street = truncate(
      normalizeSpaces(stripHtml(data.street)),
      VALIDATION.MAX_STREET_LENGTH,
    );
  }

  if (data.city !== undefined) {
    sanitized.city = truncate(normalizeSpaces(stripHtml(data.city)), VALIDATION.MAX_CITY_LENGTH);
  }

  if (data.state !== undefined) {
    sanitized.state = truncate(normalizeSpaces(stripHtml(data.state)), VALIDATION.STATE_LENGTH);
  }

  if (data.zipCode !== undefined) {
    sanitized.zipCode = data.zipCode.replace(/[^\d-]/g, '');
  }

  if (data.country !== undefined) {
    sanitized.country = truncate(normalizeSpaces(stripHtml(data.country)), 60);
  }

  return sanitized;
}

/**
 * Sanitiza dados de categoria/marca
 */
export function sanitizeCategoryData(data: { name?: string; description?: string }): {
  name?: string;
  description?: string;
} {
  const sanitized: {
    name?: string;
    description?: string;
  } = {};

  if (data.name !== undefined) {
    sanitized.name = truncate(normalizeSpaces(stripHtml(data.name)), VALIDATION.MAX_NAME_LENGTH);
  }

  if (data.description !== undefined) {
    sanitized.description = truncate(
      normalizeSpaces(stripHtml(data.description)),
      VALIDATION.MAX_DESCRIPTION_LENGTH,
    );
  }

  return sanitized;
}

// Funções de validação booleanas movidas para validators.ts
