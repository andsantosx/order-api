import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { Product } from './api/entities/Product';
import { User } from './api/entities/User';
import { Order } from './api/entities/Order';
import { OrderItem } from './api/entities/OrderItem';
import { Category } from './api/entities/Category';
import { Size } from './api/entities/Size';
import { ProductImage } from './api/entities/ProductImage';
import { ProductSize } from './api/entities/ProductSize';
import { ShippingAddress } from './api/entities/ShippingAddress';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: 'public',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [
    Product,
    User,
    Order,
    OrderItem,
    Category,
    Size,
    ProductImage,
    ProductSize,
    ShippingAddress
  ],
  migrations: [],
  subscribers: [],
});
