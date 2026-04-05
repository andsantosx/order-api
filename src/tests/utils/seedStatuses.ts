import { DataSource } from 'typeorm';
import { Status } from '../../api/entities/Status';

/**
 * Utilitário para popular os status no banco de testes
 */
export const seedStatuses = async (dataSource: DataSource) => {
  const statusRepo = dataSource.getRepository(Status);

  const statuses = [
    // Order Statuses
    { id: 1, name: 'PENDING', label: 'Pendente', type: 'ORDER' },
    { id: 2, name: 'PROCESSING', label: 'Processando', type: 'ORDER' },
    { id: 3, name: 'PAID', label: 'Pago', type: 'ORDER' },
    { id: 4, name: 'SHIPPED', label: 'Enviado', type: 'ORDER' },
    { id: 5, name: 'DELIVERED', label: 'Entregue', type: 'ORDER' },
    { id: 6, name: 'CANCELLED', label: 'Cancelado', type: 'ORDER' },
    { id: 7, name: 'REFUNDED', label: 'Reembolsado', type: 'ORDER' },
    // Contact Statuses
    { id: 101, name: 'PENDING', label: 'Pendente', type: 'CONTACT' },
    { id: 102, name: 'REPLIED', label: 'Respondido', type: 'CONTACT' },
    { id: 103, name: 'ARCHIVED', label: 'Arquivado', type: 'CONTACT' },
  ];

  for (const s of statuses) {
    const existing = await statusRepo.findOneBy({ id: s.id });
    if (!existing) {
      await statusRepo.save(statusRepo.create(s));
    }
  }
};
