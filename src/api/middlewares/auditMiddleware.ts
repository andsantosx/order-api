import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/AuditService';
import { log } from '../../config/logger';

/**
 * Middleware de Auditoria Admin
 *
 * Intercepta as requisições de ADMIN e as envia ao AuditService para
 * persistência no banco de dados.
 *
 * Fornece rastreabilidade completa das ações do administrador.
 */
export const auditMiddleware = (actionName?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Registramos após a execução da rota para capturar o payload final
    res.on('finish', () => {
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
      if (isSuccess && req.user) {
        const { user } = req;
        const finalAction = actionName || `ADMIN_ACTION_${req.method}_${req.path}`;

        AuditService.log({
          adminId: user.userId,
          adminEmail: user.email,
          action: finalAction,
          method: req.method,
          path: req.path,
          resourceId: req.params.id as string | undefined,
          payload: req.body as Record<string, unknown>,
          ip: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        }).catch((err: unknown) => log.error('[AuditMiddleware] Failed to log', { err }));
      }
    });

    next();
  };
};
