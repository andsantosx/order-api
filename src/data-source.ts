import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { Product } from './api/entities/Product';
import { User } from './api/entities/User';
import { Order } from './api/entities/Order';
import { OrderItem } from './api/entities/OrderItem';
import { StripeCheckoutSession } from './api/entities/StripeCheckoutSession';
import { Category } from './api/entities/Category';
import { Size } from './api/entities/Size';
import { ProductVariant } from './api/entities/ProductVariant';
import { ProductImage } from './api/entities/ProductImage';
import { ShippingAddress } from './api/entities/ShippingAddress';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  // Forçando o TypeORM a usar o schema 'public' explicitamente.
  // Isso resolve problemas onde o schema padrão da conexão não é o esperado.
  schema: 'public',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [
    Product,
    User,
    Order,
    OrderItem,
    StripeCheckoutSession,
    Category,
    Size,
    ProductVariant,
    ProductImage,
    ShippingAddress
  ],
  migrations: [],
  subscribers: [],
});
