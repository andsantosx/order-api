import { AppError } from '../../middlewares/errorHandler';
import { HTTP_STATUS } from '../../../constants';

/**
 * Value Object para representar valores monetários em centavos.
 * Garante precisão decimal e centraliza lógica de conversão.
 *
 * Seguindo princípios de Clean Architecture e DDD.
 */
export class Money {
  private readonly cents: number;

  constructor(value: number | string) {
    const parsedValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(parsedValue) || parsedValue < 0) {
      throw new AppError('Valor monetário inválido', HTTP_STATUS.BAD_REQUEST);
    }

    // Se o valor parece ser decimal (ex: 10.50), convertemos para centavos
    // Se for inteiro grande, assumimos que já está em centavos (padrão do sistema)
    // Para evitar ambiguidade, o sistema SEMPRE usa centavos internamente.
    this.cents = Math.round(parsedValue);
  }

  /**
   * Retorna o valor em centavos
   */
  get valueInCents(): number {
    return this.cents;
  }

  /**
   * Retorna o valor em Reais (decimal)
   */
  get valueInReals(): number {
    return this.cents / 100;
  }

  /**
   * Formata para exibição (ex: R$ 1.234,56)
   */
  format(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.valueInReals);
  }

  /**
   * Compara se dois valores são iguais
   */
  equals(other: Money): boolean {
    return this.cents === other.valueInCents;
  }

  /**
   * Adiciona um valor
   */
  add(other: Money): Money {
    return new Money(this.cents + other.valueInCents);
  }

  /**
   * Estático: Cria a partir de Reais (ex: 10.50 -> 1050 centavos)
   */
  static fromReals(value: number): Money {
    return new Money(Math.round(value * 100));
  }
}
