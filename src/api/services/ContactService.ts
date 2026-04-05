import { AppDataSource } from '../../data-source';
import { ContactMessage } from '../entities/ContactMessage';

interface ContactMessageData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export class ContactService {
  private contactRepository = AppDataSource.getRepository(ContactMessage);

  async create(data: ContactMessageData) {
    const contactMessage = this.contactRepository.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
    });

    return this.contactRepository.save(contactMessage);
  }

  async getAll() {
    return this.contactRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getOne(id: string) {
    return this.contactRepository.findOneBy({ id });
  }
}
