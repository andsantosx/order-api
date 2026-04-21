import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';
import { Password as PasswordVO } from '../domain/value-objects/Password';
import { injectable, inject } from 'tsyringe';

@injectable()
export class AuthController {
  /**
   * Registra um novo usuário.
   * Espera receber name, email e password no corpo da requisição.
   */
  async register(req: Request, res: Response, _next: NextFunction) {
    const { name, email, password, acceptedTerms, document, phone } = req.body;
    const user = await this.userService.register(
      name || 'Cliente',
      email,
      password,
      acceptedTerms,
      document,
      phone,
    );
    res.status(201).json(user);
  }

  /**
   * Realiza o login do usuário.
   * Retorna o token JWT se as credenciais estiverem corretas.
   */
  async login(req: Request, res: Response, _next: NextFunction) {
    const { email, password } = req.body;
    const result = await this.userService.login(email, password);
    res.json(result);
  }

  /**
   * Retorna o perfil do usuário logado.
   */
  async getProfile(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user?.userId;
    if (!userId) return; // Should be handled by middleware
    const user = await this.userService.getProfile(userId);
    res.json(user);
  }

  /**
   * Atualiza o perfil do usuário.
   */
  async updateProfile(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user?.userId;
    if (!userId) return;
    const user = await this.userService.updateProfile(userId, req.body);
    res.json(user);
  }

  /**
   * Solicita recuperação de senha.
   */
  async forgotPassword(req: Request, res: Response, _next: NextFunction) {
    const { email } = req.body;
    await this.userService.forgotPassword(email);
    res.json({ message: 'Se o e-mail estiver cadastrado, um código foi enviado.' });
  }

  /**
   * Verifica o código de recuperação.
   */
  async verifyCode(req: Request, res: Response, _next: NextFunction) {
    const { email, code } = req.body;
    await this.userService.verifyCode(email, code);
    res.json({ message: 'Código verificado com sucesso.' });
  }

  /**
   * Redefine a senha.
   */
  async resetPassword(req: Request, res: Response, _next: NextFunction) {
    const { email, code, password } = req.body;
    await this.userService.resetPassword(email, code, new PasswordVO(password));
    res.json({ message: 'Senha redefinida com sucesso.' });
  }

  /**
   * Verifica se o e-mail já existe na base.
   */
  async checkEmailStatus(req: Request, res: Response, _next: NextFunction) {
    const { email } = req.body;
    const result = await this.userService.checkEmailStatus(email);
    res.json(result);
  }

  /**
   * Solicita código de verificação de e-mail.
   */
  async requestEmailVerification(req: Request, res: Response, _next: NextFunction) {
    const { email } = req.body;
    await this.userService.requestEmailVerification(email);
    res.json({ message: 'Código de verificação enviado para o seu e-mail.' });
  }

  /**
   * Valida o código de verificação de e-mail.
   */
  async verifyEmailCode(req: Request, res: Response, _next: NextFunction) {
    const { email, code } = req.body;
    const result = await this.userService.verifyEmailCode(email, code);
    res.json(result);
  }

  constructor(@inject(UserService) private userService: UserService) {}
}
