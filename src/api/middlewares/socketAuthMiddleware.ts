import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { log } from '../../config/logger';

interface TokenPayload {
  userId: string;
  iat: number;
  exp: number;
}

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    log.warn('⚠️ Socket connection attempt without token');
    return next(new Error('Authentication error: Token not provided'));
  }

  try {
    const secret = env.JWT_SECRET || 'fallback_secret';
    const decoded = jwt.verify(token, secret) as TokenPayload;

    // Anexa o userId ao socket para uso posterior (join rooms, etc)
    (socket as any).userId = decoded.userId;
    log.info(`✅ Socket authenticated: user ${decoded.userId}`);
    next();
  } catch (error) {
    log.error('❌ Socket authentication failed', { error: (error as Error).message });
    next(new Error('Authentication error: Invalid token'));
  }
};
