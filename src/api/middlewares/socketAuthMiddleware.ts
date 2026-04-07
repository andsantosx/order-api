import { CustomSocket } from '../services/SocketService';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { log } from '../../config/logger';

interface TokenPayload {
  userId: string;
  isAdmin: boolean;
  email: string;
  iat: number;
  exp: number;
}

/**
 * socketAuthMiddleware
 *
 * Autentica a conexão WebSocket via token JWT enviado no handshake.
 * Extrai userId e isAdmin do payload para controle de salas (rooms).
 *
 * Uso:
 *  - socket.userId  → usado para entrar na sala user:<userId>
 *  - socket.isAdmin → usado para entrar na sala 'admins'
 */
export const socketAuthMiddleware = (socket: CustomSocket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    log.warn('Socket connection attempt without token');
    return next(new Error('Authentication error: Token not provided'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    // Expõe userId e isAdmin no socket para uso em rooms e eventos
    socket.userId  = decoded.userId;
    socket.isAdmin = decoded.isAdmin ?? false;

    log.info(`Socket authenticated: user=${decoded.userId} isAdmin=${socket.isAdmin}`);
    next();
  } catch (error: unknown) {
    log.error('Socket authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    next(new Error('Authentication error: Invalid or expired token'));
  }
};
