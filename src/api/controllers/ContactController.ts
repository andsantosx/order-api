import { Request, Response, NextFunction } from 'express';
import { ContactService } from '../services/ContactService';
import { AppError } from '../middlewares/errorHandler';
import { HTTP_STATUS } from '../../constants';

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

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await this.contactService.getOne(req.params.id as string);
      if (!message) {
        throw new AppError('Mensagem não encontrada', HTTP_STATUS.NOT_FOUND);
      }
      res.json(message);
    } catch (error) {
      next(error);
    }
  }

  async respond(req: Request, res: Response, next: NextFunction) {
    try {
      const { response } = req.body;
      if (!response) {
        throw new AppError('A resposta é obrigatória', HTTP_STATUS.BAD_REQUEST);
      }
      const message = await this.contactService.respondMessage(req.params.id as string, response);
      res.json(message);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { statusId } = req.body;
      if (statusId === undefined) {
        throw new AppError('statusId é obrigatório', HTTP_STATUS.BAD_REQUEST);
      }
      const message = await this.contactService.updateStatus(
        req.params.id as string,
        Number(statusId),
      );
      res.json(message);
    } catch (error) {
      next(error);
    }
  }
}
