import { AppError } from '../../middlewares/errorHandler';
import { HTTP_STATUS } from '../../../constants';

/**
 * Value Object para Representação e Validação de Senhas Fortes
 * Segue os princípios de Clean Architecture e DDD, garantindo que
 * uma senha inválida nunca entre no domínio do sistema.
 */
export class Password {
  private readonly value: string;

  constructor(password: string) {
    this.validate(password);
    this.value = password;
  }

  /**
   * Retorna a senha em texto plano
   */
  public toString(): string {
    return this.value;
  }

  /**
   * Executa a validação de complexidade
   * @throws {AppError} 400 - Se a senha não atender aos critérios
   */
  private validate(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new AppError('A senha deve ter no mínimo 8 caracteres.', HTTP_STATUS.BAD_REQUEST);
    }

    if (!hasUpperCase || !hasLowerCase) {
      throw new AppError(
        'A senha deve conter letras maiúsculas e minúsculas.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (!hasNumber) {
      throw new AppError('A senha deve conter pelo menos um número.', HTTP_STATUS.BAD_REQUEST);
    }

    if (!hasSpecialChar) {
      throw new AppError(
        'A senha deve conter pelo menos um caractere especial (ex: @, #, $).',
        HTTP_STATUS.BAD_REQUEST,
      );
    }
  }

  /**
   * Verifica se uma string é uma senha válida sem lançar exceção
   */
  public static isValid(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar
    );
  }
}
