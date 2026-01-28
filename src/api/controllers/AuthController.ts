import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';

export class AuthController {
    private userService = new UserService();

    /**
     * Registra um novo usuário.
     * Espera receber name, email e password no corpo da requisição.
     */
    async register(req: Request, res: Response, next: NextFunction) {
        const { name, email, password } = req.body;
        const user = await this.userService.register(name || 'Cliente', email, password);
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

    /**
     * Retorna o perfil do usuário logado.
     */
    async getProfile(req: Request, res: Response, next: NextFunction) {
        const userId = req.user?.userId;
        if (!userId) return; // Should be handled by middleware
        const user = await this.userService.getProfile(userId);
        res.json(user);
    }

    /**
     * Atualiza o perfil do usuário.
     */
    async updateProfile(req: Request, res: Response, next: NextFunction) {
        const userId = req.user?.userId;
        if (!userId) return;
        const user = await this.userService.updateProfile(userId, req.body);
        res.json(user);
    }
}
