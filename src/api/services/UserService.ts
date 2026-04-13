import { AppDataSource } from '../../data-source';
import { User } from '../entities/User';
import { EmailVerification } from '../entities/EmailVerification';
import { AppError } from '../middlewares/errorHandler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UserResponse } from '../../types';
import { sanitizeUserData } from '../../utils/sanitizer';
import { SECURITY, ERROR_MESSAGES, HTTP_STATUS } from '../../constants';
import { CPF } from '../domain/value-objects/CPF';
import { Password as PasswordVO } from '../domain/value-objects/Password';
import { EmailService } from './EmailService';

/**
 * Service responsável pela lógica de negócio relacionada a usuários
 * Gerencia autenticação, registro e perfil de usuários
 */
export class UserService {
  private userRepository = AppDataSource.getRepository(User);
  private emailVerificationRepository = AppDataSource.getRepository(EmailVerification);
  private emailService = new EmailService();

  /**
   * Registra um novo usuário no sistema
   *
   * @param name - Nome do usuário
   * @param email - Email do usuário (será normalizado)
   * @param password - Senha em texto plano (será hasheada)
   * @param acceptedTerms - Flag de aceite dos termos
   * @returns Dados do usuário criado (sem senha)
   * @throws {AppError} 400 - Se o email já estiver em uso ou termos não aceitos
   *
   * @example
   * const user = await userService.register('João Silva', 'joao@example.com', 'senha123', true);
   */
  async register(
    name: string,
    email: string,
    password: string,
    acceptedTerms: boolean,
    document?: string,
    phone?: string,
  ): Promise<UserResponse> {
    // Verifica aceite dos termos
    if (!acceptedTerms) {
      throw new AppError(ERROR_MESSAGES.TERMS_NOT_ACCEPTED, HTTP_STATUS.BAD_REQUEST);
    }

    // Valida complexidade da senha via Value Object (Domain Layer)
    new PasswordVO(password);

    // Valida CPF se fornecido
    if (document) {
      new CPF(document); // O construtor valida e lança AppError se inválido
    }

    // Sanitiza os dados de entrada para prevenir XSS
    const sanitized = sanitizeUserData({ name, email });

    // Verifica se o email já está em uso
    const existingUser = await this.userRepository.findOneBy({ email: sanitized.email });
    if (existingUser) {
      throw new AppError(ERROR_MESSAGES.USER_EXISTS, HTTP_STATUS.BAD_REQUEST);
    }

    const passwordHash = await bcrypt.hash(password, SECURITY.BCRYPT_SALT_ROUNDS);

    // Verifica se o e-mail foi validado via OTP
    const verification = await this.emailVerificationRepository.findOneBy({
      email: sanitized.email,
      isVerified: true,
    });

    if (!verification) {
      throw new AppError(
        'E-mail não verificado. Por favor, confirme seu e-mail antes de criar a conta.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const user = this.userRepository.create({
      name: sanitized.name,
      email: sanitized.email,
      passwordHash: passwordHash,
      isAdmin: false,
      document: document || undefined,
      phone: phone || undefined,
      acceptedTerms: true,
    });

    await this.userRepository.save(user);

    // Remove a verificação após o registro bem sucedido
    await this.emailVerificationRepository.remove(verification);

    // Envia e-mail de boas-vindas (assíncrono, não bloqueia o retorno)
    this.emailService.sendWelcomeEmail(user.email, user.name);

    // Retorna dados do usuário sem informações sensíveis
    return this.getSanitizedUserOutput(user);
  }

  /**
   * Autentica um usuário e gera um token JWT
   *
   * @param email - Email do usuário
   * @param password - Senha em texto plano
   * @returns Objeto contendo dados do usuário e token JWT
   * @throws {AppError} 401 - Se as credenciais forem inválidas
   *
   * @example
   * const { user, token } = await userService.login('joao@example.com', 'senha123');
   */
  async login(email: string, password: string) {
    // Normaliza o email para busca
    const sanitized = sanitizeUserData({ email });

    // Busca usuário explicitando a seleção do hash da senha (que é oculta por padrão)
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: sanitized.email })
      .getOne();

    if (!user) {
      // Artificial delay to prevent brute-force
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
      // Mensagem genérica para não revelar se o email existe
      throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    // Verifica se a senha é válida
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Artificial delay to prevent brute-force
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
      throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    // Gera token JWT com dados do usuário
    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: user.isAdmin },
      env.JWT_SECRET, // Usa o secret validado (sem fallback inseguro)
      { expiresIn: SECURITY.JWT_EXPIRATION },
    );

    return {
      user: this.getSanitizedUserOutput(user),
      token,
    };
  }

  /**
   * Busca o perfil do usuário autenticado
   *
   * @param userId - ID do usuário
   * @returns Dados do perfil do usuário (sem senha)
   * @throws {AppError} 404 - Se o usuário não for encontrado
   */
  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return this.getSanitizedUserOutput(user);
  }

  /**
   * Atualiza o perfil do usuário
   *
   * @param userId - ID do usuário a ser atualizado
   * @param data - Dados a serem atualizados (name, email, password)
   * @returns Dados atualizados do usuário (sem senha)
   * @throws {AppError} 404 - Se o usuário não for encontrado
   * @throws {AppError} 400 - Se o email já estiver em uso por outro usuário
   */
  async updateProfile(
    userId: string,
    data: { name?: string; email?: string; password?: string; document?: string; phone?: string },
  ): Promise<UserResponse> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Valida CPF se fornecido
    if (data.document) {
      new CPF(data.document); // O construtor valida e lança AppError se inválido
    }

    // Sanitiza os dados de entrada
    const sanitized = sanitizeUserData(data);

    // Atualiza nome se fornecido
    if (sanitized.name) {
      user.name = sanitized.name;
    }

    // Atualiza email se fornecido e disponível
    if (sanitized.email) {
      const existingUser = await this.userRepository.findOneBy({ email: sanitized.email });
      if (existingUser && existingUser.id !== userId) {
        throw new AppError(ERROR_MESSAGES.EMAIL_IN_USE, HTTP_STATUS.BAD_REQUEST);
      }
      user.email = sanitized.email;
    }

    // Atualiza senha se fornecida
    if (data.password) {
      new PasswordVO(data.password);
      user.passwordHash = await bcrypt.hash(data.password, SECURITY.BCRYPT_SALT_ROUNDS);
    }

    // CPF (document) update is disabled

    // Atualiza telefone se fornecido
    if (data.phone) {
      user.phone = data.phone;
    }

    await this.userRepository.save(user);

    return this.getSanitizedUserOutput(user);
  }

  /**
   * Solicita a recuperação de senha
   */
  async forgotPassword(email: string): Promise<void> {
    const sanitized = sanitizeUserData({ email });
    const user = await this.userRepository.findOneBy({ email: sanitized.email });

    // Se o usuário não existir, retornamos sucesso silencioso por segurança
    // Mas não enviamos email se não existir
    if (!user) {
      // Pequeno delay para evitar timing attacks
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));
      return;
    }

    // Gera código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    user.resetPasswordCode = code;
    user.resetPasswordExpiresAt = expiresAt;

    await this.userRepository.save(user);

    // Envia o email
    await this.emailService.sendPasswordResetEmail(user.email, user.name, code);
  }

  /**
   * Verifica se o código de recuperação é válido
   */
  async verifyCode(email: string, code: string): Promise<boolean> {
    const sanitized = sanitizeUserData({ email });
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.resetPasswordCode')
      .addSelect('user.resetPasswordExpiresAt')
      .where('user.email = :email', { email: sanitized.email })
      .getOne();

    if (!user || user.resetPasswordCode !== code) {
      throw new AppError('Código inválido ou e-mail não encontrado', HTTP_STATUS.BAD_REQUEST);
    }

    if (user.resetPasswordExpiresAt && user.resetPasswordExpiresAt < new Date()) {
      throw new AppError('Código expirado', HTTP_STATUS.BAD_REQUEST);
    }

    return true;
  }

  /**
   * Redefine a senha do usuário usando o código de verificação
   */
  async resetPassword(email: string, code: string, password: PasswordVO): Promise<void> {
    const sanitized = sanitizeUserData({ email });
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.resetPasswordCode')
      .addSelect('user.resetPasswordExpiresAt')
      .where('user.email = :email', { email: sanitized.email })
      .getOne();

    if (!user || user.resetPasswordCode !== code) {
      throw new AppError('Código inválido ou e-mail não encontrado', HTTP_STATUS.BAD_REQUEST);
    }

    if (user.resetPasswordExpiresAt && user.resetPasswordExpiresAt < new Date()) {
      throw new AppError('Código expirado', HTTP_STATUS.BAD_REQUEST);
    }

    // Hash da nova senha
    user.passwordHash = await bcrypt.hash(password.toString(), SECURITY.BCRYPT_SALT_ROUNDS);

    // Limpa os campos de reset
    user.resetPasswordCode = undefined;
    user.resetPasswordExpiresAt = undefined;

    await this.userRepository.save(user);
  }

  /**
   * Verifica se um e-mail já possui conta cadastrada na plataforma
   * @param email - E-mail a ser verificado
   * @returns { userExists: boolean }
   */
  async checkEmailStatus(email: string): Promise<{ userExists: boolean }> {
    const sanitized = sanitizeUserData({ email });
    const user = await this.userRepository.findOneBy({ email: sanitized.email });

    return { userExists: !!user };
  }

  /**
   * Solicita um código de verificação para e-mail (Checkout ou Cadastro)
   */
  async requestEmailVerification(email: string): Promise<void> {
    const sanitized = sanitizeUserData({ email });

    // Gera código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Salva ou atualiza a verificação pendente
    let verification = await this.emailVerificationRepository.findOneBy({
      email: sanitized.email,
    });

    if (verification) {
      verification.code = code;
      verification.expiresAt = expiresAt;
      verification.isVerified = false;
    } else {
      verification = this.emailVerificationRepository.create({
        email: sanitized.email,
        code,
        expiresAt,
        isVerified: false,
      });
    }

    await this.emailVerificationRepository.save(verification);

    // Envia o e-mail com o código
    await this.emailService.sendEmailVerificationEmail(sanitized.email!, code);
  }

  /**
   * Valida o código de verificação de e-mail
   */
  async verifyEmailCode(email: string, code: string): Promise<{ verified: boolean }> {
    const sanitized = sanitizeUserData({ email });
    const verification = await this.emailVerificationRepository.findOneBy({
      email: sanitized.email,
    });

    if (!verification) {
      throw new AppError('Nenhuma verificação pendente para este e-mail', HTTP_STATUS.NOT_FOUND);
    }

    if (verification.code !== code) {
      throw new AppError('Código de verificação incorreto', HTTP_STATUS.BAD_REQUEST);
    }

    if (verification.expiresAt < new Date()) {
      throw new AppError('Este código já expirou. Peça um novo.', HTTP_STATUS.BAD_REQUEST);
    }

    verification.isVerified = true;
    await this.emailVerificationRepository.save(verification);

    return { verified: true };
  }

  /**
   * Método privado para remover dados sensíveis do usuário
   * Previne exposição acidental de password_hash
   *
   * @param user - Entidade do usuário
   * @returns Dados do usuário sem informações sensíveis
   */
  private getSanitizedUserOutput(user: User): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      document: user.document,
      phone: user.phone,
      acceptedTerms: user.acceptedTerms,
    };
  }
}
