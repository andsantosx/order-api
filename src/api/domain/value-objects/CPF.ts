import { AppError } from '../../middlewares/errorHandler';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../../constants';

export class CPF {
  private readonly _value: string;

  constructor(value: string) {
    const cleanValue = CPF.normalize(value);

    if (!CPF.validate(cleanValue)) {
      throw new AppError(ERROR_MESSAGES.INVALID_CPF, HTTP_STATUS.BAD_REQUEST);
    }

    this._value = cleanValue;
  }

  /**
   * Returns only digits
   */
  get value(): string {
    return this._value;
  }

  /**
   * Returns formatted CPF (999.999.999-99)
   */
  format(): string {
    return this._value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Static validation helper
   */
  static validate(cpf: string): boolean {
    const cleanCpf = CPF.normalize(cpf);

    if (cleanCpf.length !== 11) return false;

    // Reject known invalid CPFs (repetitive digits)
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

    let sum = 0;
    let remainder;

    // First verification digit
    for (let i = 1; i <= 9; i++) {
      sum = sum + parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false;

    // Second verification digit
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum = sum + parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false;

    return true;
  }

  /**
   * Strips non-digits
   */
  static normalize(value: string): string {
    return value.replace(/\D/g, '');
  }

  equals(other: CPF): boolean {
    return this._value === other.value;
  }
}
