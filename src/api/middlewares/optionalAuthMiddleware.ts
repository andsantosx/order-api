import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

interface JwtPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
}

export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const [, token] = authHeader.split(' ');

  if (!token) {
    // If header exists but no token, consider it malformed -> 401
    throw new AppError('Malformed token', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as JwtPayload;

    req.user = decoded;
    next();
  } catch (_error) {
    // If token provided but invalid/expired -> 401
    throw new AppError('Invalid token', 401);
  }
};
