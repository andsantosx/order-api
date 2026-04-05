import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { log } from '../../config/logger';

interface RecaptchaResponse {
  success: boolean;
  challenge_ts: string;
  hostname: string;
  'error-codes'?: string[];
}

/**
 * Middleware para validar o Google reCAPTCHA v2 (Invisível)
 *
 * O token deve ser enviado no cabeçalho 'x-recaptcha-token' ou no corpo da requisição como 'recaptchaToken'.
 */
export const recaptchaMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Ignorar validação em ambiente de teste
  if (process.env.NODE_ENV === 'test' || env.NODE_ENV === 'test') {
    return next();
  }

  const token = (req.headers['x-recaptcha-token'] as string) || req.body.recaptchaToken;

  if (!token) {
    log.warn(
      `Tentativa de acesso sem token reCAPTCHA na rota: ${req.originalUrl} | Ignorando bloqueio conforme configuração.`,
    );
    return next();
  }

  try {
    const googleVerifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

    // Timeout de 5 segundos para a chamada ao Google
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const params = new URLSearchParams({
      secret: env.RECAPTCHA_SECRET_KEY,
      response: token,
      remoteip: req.ip || '',
    });

    const response = await fetch(googleVerifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = (await response.json()) as RecaptchaResponse;

    if (!data.success) {
      log.warn(
        `Falha na validação do reCAPTCHA v2. Resposta Completa: ${JSON.stringify(data)} | IP: ${req.ip} | Ignorando bloqueio.`,
      );
      return next();
    }

    // Boas Práticas: Logar o hostname para auditoria
    if (data.hostname) {
      log.debug(`reCAPTCHA v2 validado: Host: ${data.hostname}`);
    }

    // Sucesso na verificação
    next();
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      log.error('Timeout ao verificar reCAPTCHA com a API do Google. Prosseguindo sem validação.');
    } else {
      log.error(
        `Erro ao verificar reCAPTCHA v2: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Prosseguindo sem validação.`,
      );
    }
    next();
  }
};
