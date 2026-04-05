import { CustomSocket } from '../services/SocketService';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { log } from '../../config/logger';

interface TokenPayload {
  userId: string;
  iat: number;
  exp: number;
}

export const socketAuthMiddleware = (socket: CustomSocket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    log.warn('⚠️ Socket connection attempt without token');
    return next(new Error('Authentication error: Token not provided'));
  }

  try {
    const secret = env.JWT_SECRET || 'fallback_secret';
    const decoded = jwt.verify(token, secret) as TokenPayload;

    // Anexa o userId ao socket para uso posterior (join rooms, etc)
    socket.userId = decoded.userId;
    log.info(`✅ Socket authenticated: user ${decoded.userId}`);
    next();
  } catch (error: unknown) {
    log.error('❌ Socket authentication failed', { error: error instanceof Error ? error.message : 'Unknown' });
    next(new Error('Authentication error: Invalid token'));
  }
};
