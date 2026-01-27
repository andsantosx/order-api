import { MercadoPagoConfig } from 'mercadopago';
import dotenv from 'dotenv';

dotenv.config();

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!accessToken) {
    console.warn('MERCADOPAGO_ACCESS_TOKEN is not defined in .env');
}

export const client = new MercadoPagoConfig({ accessToken: accessToken || '' });
