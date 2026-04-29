import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { env } from '../../config/env';
import { JwtPayload } from '../../types';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../constants';

/**
 * Middleware de autenticação JWT
 *
 * Valida o token JWT enviado no header Authorization
 * e adiciona os dados do usuário ao objeto Request
 *
 * @throws {AppError} 401 - Token não fornecido, mal formatado ou inválido
 *
 * @example
 * // Uso em rotas protegidas
 * router.get('/profile', authMiddleware, profileController.getProfile);
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Tenta obter o token do cookie httpOnly (recomendado)
  let token = req.cookies?.token;

  // Se não tiver cookie, tenta obter do header Authorization (backward compatibility)
  if (!token) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      // Formato esperado: "Bearer <token>"
      const parts = authHeader.split(' ');
      token = parts[1];
    }
  }

  // Se não encontrou token em nenhum lugar
  if (!token) {
    throw new AppError(ERROR_MESSAGES.NO_TOKEN, HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    // Verifica e decodifica o token usando o secret validado
    const decoded = jwt.verify(
      token,
      env.JWT_SECRET, // Usa o secret validado do env.ts (sem fallback inseguro)
    ) as JwtPayload;

    // Adiciona os dados do usuário ao request
    req.user = decoded;
    next();
  } catch (_error) {
    throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
  }
};
