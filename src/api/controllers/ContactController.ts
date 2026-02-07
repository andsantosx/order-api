import { Request, Response, NextFunction } from 'express';
import { ContactService } from '../services/ContactService';

export class ContactController {
  private contactService = new ContactService();

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const contactMessage = await this.contactService.create(req.body);
      res.status(201).json(contactMessage);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const messages = await this.contactService.getAll();
      res.json(messages);
    } catch (error) {
      next(error);
    }
  }
}
