import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';

export class AuthController {
    private userService = new UserService();

    async register(req: Request, res: Response, next: NextFunction) {
        const { email, password } = req.body;
        const user = await this.userService.register(email, password);
        res.status(201).json(user);
    }

    async login(req: Request, res: Response, next: NextFunction) {
        const { email, password } = req.body;
        const result = await this.userService.login(email, password);
        res.json(result);
    }
}
