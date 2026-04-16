import { HTTP_STATUS } from '../../constants';

export class PaymentException extends Error {
  public readonly statusCode: number;
  public readonly code?: string;

  constructor(message: string, statusCode: number = HTTP_STATUS.BAD_REQUEST, code?: string) {
    super(message);
    this.name = 'PaymentException';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, PaymentException.prototype);
  }
}

export class PaymentProcessingException extends PaymentException {
  constructor(message: string, code?: string) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, code);
    this.name = 'PaymentProcessingException';
  }
}

export class PaymentValidationException extends PaymentException {
  constructor(message: string, code?: string) {
    super(message, HTTP_STATUS.BAD_REQUEST, code);
    this.name = 'PaymentValidationException';
  }
}

export class PaymentRejectedException extends PaymentException {
  constructor(message: string, code: string) {
    // 402 Payment Required is semantically appropriate for rejected card payments
    super(message, 402, code);
    this.name = 'PaymentRejectedException';
  }
}
