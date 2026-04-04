import { AppDataSource } from '../../data-source';
import { log } from '../../config/logger';

export interface AuditLogData {
  adminId: string;
  adminEmail: string;
  action: string;
  method: string;
  path: string;
  resourceId?: string;
  payload?: any;
  prevValues?: any;
  ip: string;
  userAgent: string;
}

/**
 * AuditService
 * 
 * Centraliza o registro de ações administrativas para fins de segurança e auditoria (Compliance).
 * 
 * Segue os princípios de Clean Architecture ao isolar o mecanismo de log.
 */
export class AuditService {
  private static repository = AppDataSource.getRepository('admin_audit_logs');

  /**
   * Grava um log de auditoria no banco de dados de forma assíncrona (Fire and forget no fluxo principal)
   */
  public static async log(data: AuditLogData): Promise<void> {
    try {
      const auditLog = this.repository.create({
        ...data,
        payload: data.payload ? JSON.stringify(data.payload) : null,
        prevValues: data.prevValues ? JSON.stringify(data.prevValues) : null,
      });

      await this.repository.save(auditLog);
      log.info(`[Audit] Action '${data.action}' logged for admin ${data.adminEmail}`);
    } catch (error) {
      // Falha no log de auditoria não deve derrubar a requisição principal, mas deve ser registrada
      log.error('[Audit] Failed to record audit log', { error, data });
    }
  }
}
