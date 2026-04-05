/**
 * Express type augmentation for authenticated user context.
 * This file extends the Express Request interface to include
 * the `user` property populated by the authMiddleware.
 */
import { JwtPayload } from './index';

declare global {
  namespace Express {
    interface Request {
      /** Dados do usuário autenticado (disponível após authMiddleware) */
      user?: JwtPayload;
    }
  }
}

export {};
