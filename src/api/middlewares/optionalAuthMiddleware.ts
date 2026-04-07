import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { env } from '../../config/env';

interface JwtPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
}

/**
 * optionalAuthMiddleware
 *
 * Tenta autenticar a requisição se o header Authorization estiver presente.
 * Se não houver token, segue normalmente (Guest Checkout).
 * Se o token for inválido/expirado, retorna 401.
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(); // Guest — sem auth é válido para este endpoint
  }

  const [, token] = authHeader.split(' ');

  if (!token) {
    throw new AppError('Token mal formatado', 401);
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    throw new AppError('Token inválido ou expirado', 401);
  }
};
