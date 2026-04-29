import { MercadoPagoConfig } from 'mercadopago';
import dotenv from 'dotenv';
import { log } from './logger';

dotenv.config();

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!accessToken) {
  log.warn('MERCADOPAGO_ACCESS_TOKEN is not defined in .env');
}

export const client = new MercadoPagoConfig({ accessToken: accessToken || '' });
