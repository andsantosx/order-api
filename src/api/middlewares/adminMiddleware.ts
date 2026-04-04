import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../constants';

/**
 * Middleware para restringir acesso apenas a administradores.
 * Deve ser usado APÓS o authMiddleware.
 *
 * @throws {AppError} 403 - Se o usuário não for administrador
 */
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError(ERROR_MESSAGES.NO_TOKEN, HTTP_STATUS.UNAUTHORIZED);
  }

  if (!req.user.isAdmin) {
    throw new AppError('Acesso restrito a administradores', HTTP_STATUS.FORBIDDEN);
  }

  next();
};
