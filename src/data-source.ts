import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { Product } from './api/entities/Product';
import { User } from './api/entities/User';
import { Order } from './api/entities/Order';
import { OrderItem } from './api/entities/OrderItem';
import { StripeCheckoutSession } from './api/entities/StripeCheckoutSession';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: process.env.NODE_ENV === 'development', // Use com cuidado em produção
  logging: false,
  entities: [Product, User, Order, OrderItem, StripeCheckoutSession],
  migrations: [],
  subscribers: [],
});
