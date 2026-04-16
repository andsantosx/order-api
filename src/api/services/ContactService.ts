import { AppDataSource } from '../../data-source';
import { ContactMessage, ContactMessageStatus } from '../entities/ContactMessage';
import { AppError } from '../middlewares/errorHandler';
import { HTTP_STATUS } from '../../constants';
import { EmailService } from './EmailService';

interface ContactMessageData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export class ContactService {
  private contactRepository = AppDataSource.getRepository(ContactMessage);
  private emailService = new EmailService();

  async create(data: ContactMessageData) {
    const contactMessage = this.contactRepository.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
      statusId: ContactMessageStatus.PENDING,
    });

    const saved = await this.contactRepository.save(contactMessage);

    // Enviar notificação interna para a administração
    try {
      await this.emailService.sendInternalContactNotification(data);
    } catch (error: unknown) {
      console.error('Erro ao enviar e-mail de notificação de contato:', error);
    }

    return this.getOne(saved.id);
  }

  async getAll() {
    return this.contactRepository.find({
      relations: ['status'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOne(id: string) {
    return this.contactRepository.findOne({
      where: { id },
      relations: ['status'],
    });
  }

  /**
   * Responde uma mensagem de contato e atualiza o status para REPLIED
   */
  async respondMessage(id: string, responseText: string) {
    const message = await this.getOne(id);

    if (!message) {
      throw new AppError('Mensagem não encontrada', HTTP_STATUS.NOT_FOUND);
    }

    // Reset relation to avoid precedence conflict with statusId during save
    Object.assign(message, { status: undefined });
    message.response = responseText;
    message.statusId = ContactMessageStatus.REPLIED;

    const saved = await this.contactRepository.save(message);

    // Enviar e-mail de resposta para o cliente
    try {
      await this.emailService.sendContactResponseEmail(
        saved.email,
        saved.name,
        saved.subject,
        saved.message,
        saved.response || '',
      );
    } catch (error: unknown) {
      console.error('Erro ao enviar e-mail de resposta de contato:', error);
    }

    return this.getOne(saved.id);
  }

  /**
   * Atualiza manualmente o status de uma mensagem
   */
  async updateStatus(id: string, statusId: number) {
    const message = await this.getOne(id);

    if (!message) {
      throw new AppError('Mensagem não encontrada', HTTP_STATUS.NOT_FOUND);
    }

    // Reset relation to avoid precedence conflict with statusId during save
    Object.assign(message, { status: undefined });
    message.statusId = statusId;

    const saved = await this.contactRepository.save(message);
    return this.getOne(saved.id);
  }
}
