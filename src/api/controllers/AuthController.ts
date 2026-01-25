import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';

export class AuthController {
    private userService = new UserService();

    /**
     * Registra um novo usuário.
     * Espera receber email e password no corpo da requisição.
     */
    async register(req: Request, res: Response, next: NextFunction) {
        const { email, password } = req.body;
        const user = await this.userService.register(email, password);
        res.status(201).json(user);
    }

    /**
     * Realiza o login do usuário.
     * Retorna o token JWT se as credenciais estiverem corretas.
     */
    async login(req: Request, res: Response, next: NextFunction) {
        const { email, password } = req.body;
        const result = await this.userService.login(email, password);
        res.json(result);
    }
}
