import { VALIDATION } from '../constants';

/**
 * Remove tags HTML e scripts maliciosos de uma string
 * Previne ataques XSS (Cross-Site Scripting)
 *
 * @param input - String possivelmente com conteúdo malicioso
 * @returns String sanitizada sem HTML/scripts
 */
function stripHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Trunca uma string para um comprimento máximo
 *
 * @param input - String a truncar
 * @param maxLength - Comprimento máximo permitido
 * @returns String truncada
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
 * Remove HTML, normaliza espaços e valida comprimentos
 */
export function sanitizeUserData(data: { name?: string; email?: string; document?: string }): {
  name?: string;
  email?: string;
  document?: string;
} {
  const sanitized: {
    name?: string;
    email?: string;
    document?: string;
  } = {};

  if (data.name !== undefined) {
    sanitized.name = truncate(normalizeSpaces(stripHtml(data.name)), VALIDATION.MAX_NAME_LENGTH);
  }

  if (data.email !== undefined) {
    sanitized.email = data.email.toLowerCase().trim();
  }

  if (data.document !== undefined) {
    // Remove formatação do CPF (mantém apenas números)
    sanitized.document = data.document.replace(/\D/g, '');
  }

  return sanitized;
}

/**
 * Sanitiza dados de produto
 * Remove HTML, valida comprimentos e URLs de imagens
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
    // Valida e sanitiza URLs de imagens
    sanitized.images = data.images.map((url) => url.trim()).filter((url) => isValidImageUrl(url));
  }

  return sanitized;
}

/**
 * Sanitiza dados de endereço
 * Remove HTML e valida comprimentos
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
      VALIDATION.MAX_ADDRESS_LENGTH,
    );
  }

  if (data.city !== undefined) {
    sanitized.city = truncate(normalizeSpaces(stripHtml(data.city)), VALIDATION.MAX_ADDRESS_LENGTH);
  }

  if (data.state !== undefined) {
    sanitized.state = truncate(
      normalizeSpaces(stripHtml(data.state)),
      VALIDATION.MAX_ADDRESS_LENGTH,
    );
  }

  if (data.zipCode !== undefined) {
    // Remove formatação do CEP (mantém apenas números e hífen)
    sanitized.zipCode = data.zipCode.replace(/[^\d-]/g, '');
  }

  if (data.country !== undefined) {
    sanitized.country = truncate(
      normalizeSpaces(stripHtml(data.country)),
      VALIDATION.MAX_ADDRESS_LENGTH,
    );
  }

  return sanitized;
}

/**
 * Sanitiza dados de categoria/marca
 * Remove HTML e valida comprimentos
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

/**
 * Valida se uma URL de imagem é de um domínio permitido
 * Previne carregamento de imagens maliciosas
 *
 * @param url - URL da imagem a validar
 * @returns true se a URL for válida e de domínio permitido
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Verifica se é HTTP ou HTTPS
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false;
    }

    // Verifica se o domínio está na lista de permitidos
    const fullUrl = url.toLowerCase();
    return VALIDATION.ALLOWED_IMAGE_DOMAINS.some((domain: string) =>
      fullUrl.startsWith(domain.toLowerCase()),
    );
  } catch {
    return false;
  }
}

/**
 * Valida formato de CEP brasileiro
 *
 * @param zipCode - CEP a validar (com ou sem formatação)
 * @returns true se o formato for válido
 */
export function isValidZipCode(zipCode: string): boolean {
  return VALIDATION.ZIPCODE_REGEX.test(zipCode);
}

/**
 * Valida formato de CPF
 * Apenas validação de formato (11 dígitos), não valida dígitos verificadores
 *
 * @param cpf - CPF a validar (apenas números)
 * @returns true se o formato for válido
 */
export function isValidCPF(cpf: string): boolean {
  return VALIDATION.CPF_REGEX.test(cpf);
}

/**
 * Valida se uma string é uma URL HTTP(S) válida
 *
 * @param url - URL a validar
 * @returns true se for uma URL válida
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}
