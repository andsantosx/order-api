import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para sanitizar entradas do usuário
 * Remove tags HTML e padrões comuns de injeção de strings recursivamente em:
 * - req.body
 * - req.query
 * - req.params
 *
 * Este é um componente essencial de Defesa em Profundidade.
 */
export const sanitizationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove tags HTML/XML (XSS Protection)
      // e padrões de script básicos
      return value
        .replace(/<[^>]*>?/gm, '') // Remove HTML tags
        .replace(/script/gi, '') // Remove simple script keywords
        .trim();
    }

    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }

    if (typeof value === 'object' && value !== null) {
      const sanitizedObj: any = {};
      for (const key in value) {
        sanitizedObj[key] = sanitizeValue(value[key]);
      }
      return sanitizedObj;
    }

    return value;
  };

  // Sanitizamos as entradas sem reatribuir os objetos raiz (que podem ser apenas getters)
  if (req.body && typeof req.body === 'object') {
    const sanitizedBody = sanitizeValue(req.body);
    Object.assign(req.body, sanitizedBody);
  }

  if (req.query && typeof req.query === 'object') {
    const sanitizedQuery = sanitizeValue(req.query);
    // Limpamos e reatribuímos propriedades para manter a referência do objeto original
    Object.keys(req.query).forEach((key) => delete req.query[key]);
    Object.assign(req.query, sanitizedQuery);
  }

  if (req.params && typeof req.params === 'object') {
    const sanitizedParams = sanitizeValue(req.params);
    Object.keys(req.params).forEach((key) => delete req.params[key]);
    Object.assign(req.params, sanitizedParams);
  }

  next();
};
