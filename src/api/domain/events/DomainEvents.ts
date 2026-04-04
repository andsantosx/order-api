import { EventEmitter } from 'events';
import { log } from '../../../config/logger';

/**
 * DomainEvents
 * 
 * Implementação do padrão Mediator para desacoplar a lógica de negócio (Services)
 * de mecanismos de entrega ou infraestrutura (WebSockets, E-mails, Logs).
 * 
 * Segue os princípios de Clean Architecture ao permitir que o domínio notifique
 * mudanças sem conhecer quem está ouvindo.
 */
class DomainEvents extends EventEmitter {
  private static instance: DomainEvents;

  private constructor() {
    super();
    this.setMaxListeners(20);
  }

  public static getInstance(): DomainEvents {
    if (!DomainEvents.instance) {
      DomainEvents.instance = new DomainEvents();
    }
    return DomainEvents.instance;
  }

  /**
   * Dispara um evento de domínio de forma segura
   */
  public dispatch(event: string, data: any): void {
    log.info(`[DomainEvent] Dispatching: ${event}`, { event });
    this.emit(event, data);
  }

  /**
   * Registra um listener para um evento
   */
  public subscribe(event: string, handler: (data: any) => void): void {
    log.info(`[DomainEvent] Subscribed to: ${event}`);
    this.on(event, handler);
  }
}

export const domainEvents = DomainEvents.getInstance();
