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
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      token = parts[1];
    }
  }

  if (!token) {
    return next(); // Guest — sem auth é válido para este endpoint
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    throw new AppError('Token inválido ou expirado', 401);
  }
};
