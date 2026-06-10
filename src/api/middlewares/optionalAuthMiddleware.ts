import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { JwtPayload } from '../../types';

/**
 * Middleware de autenticação OPCIONAL
 *
 * Se um token JWT válido for enviado (cookie ou Authorization header), os dados
 * do usuário são adicionados ao `req.user`. Caso contrário, a requisição
 * continua normalmente como anônima (guest) — sem lançar erro.
 *
 * Diferença do `authMiddleware`: tokens inválidos/expirados são ignorados
 * silenciosamente em vez de retornar 401. Usado em rotas públicas que se
 * beneficiam de informações do usuário logado quando disponíveis.
 *
 * @example
 * router.get('/validate', optionalAuthMiddleware, couponController.validate);
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Tenta obter o token do cookie httpOnly (recomendado)
  let token = req.cookies?.token;

  // Se não tiver cookie, tenta obter do header Authorization
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      token = parts[1];
    }
  }

  // Se não encontrou token em nenhum lugar, continua como guest
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
  } catch {
    // Token inválido ou expirado → ignora silenciosamente, trata como guest
    // Não lança erro pois a rota é pública
  }

  return next();
};

