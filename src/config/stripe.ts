import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in your .env file');
}

// Usamos 'as any' para contornar um erro de tipo incorreto e persistente no ambiente de build.
// A API da Stripe espera uma string para apiVersion, e estamos fornecendo uma.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
  typescript: true,
} as any);
