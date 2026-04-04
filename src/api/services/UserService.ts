import { AppDataSource } from '../../data-source';
import { User } from '../entities/User';
import { AppError } from '../middlewares/errorHandler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UserResponse } from '../../types';
import { sanitizeUserData } from '../../utils/sanitizer';
import { SECURITY, ERROR_MESSAGES, HTTP_STATUS } from '../../constants';

/**
 * Service responsável pela lógica de negócio relacionada a usuários
 * Gerencia autenticação, registro e perfil de usuários
 */
export class UserService {
  private userRepository = AppDataSource.getRepository(User);

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
  ): Promise<UserResponse> {
    // Verifica aceite dos termos
    if (!acceptedTerms) {
      throw new AppError(ERROR_MESSAGES.TERMS_NOT_ACCEPTED, HTTP_STATUS.BAD_REQUEST);
    }

    // Sanitiza os dados de entrada para prevenir XSS
    const sanitized = sanitizeUserData({ name, email });

    // Verifica se o email já está em uso
    const existingUser = await this.userRepository.findOneBy({ email: sanitized.email });
    if (existingUser) {
      throw new AppError(ERROR_MESSAGES.USER_EXISTS, HTTP_STATUS.BAD_REQUEST);
    }

    // Gera hash seguro da senha usando bcrypt
    const passwordHash = await bcrypt.hash(password, SECURITY.BCRYPT_SALT_ROUNDS);

    const user = this.userRepository.create({
      name: sanitized.name,
      email: sanitized.email,
      password_hash: passwordHash,
      isAdmin: false, // Usuários normais não são admin por padrão
      accepted_terms: true,
    });

    await this.userRepository.save(user);

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

    const user = await this.userRepository.findOneBy({ email: sanitized.email });
    if (!user) {
      // Mensagem genérica para não revelar se o email existe
      throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    // Verifica se a senha é válida
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
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
    data: { name?: string; email?: string; password?: string },
  ): Promise<UserResponse> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
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
      user.password_hash = await bcrypt.hash(data.password, SECURITY.BCRYPT_SALT_ROUNDS);
    }

    await this.userRepository.save(user);

    return this.getSanitizedUserOutput(user);
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
      acceptedTerms: user.accepted_terms,
    };
  }
}
