import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './config/env';
import { Product } from './api/entities/Product';
import { User } from './api/entities/User';
import { Order } from './api/entities/Order';
import { OrderItem } from './api/entities/OrderItem';
import { Category } from './api/entities/Category';
import { Size } from './api/entities/Size';
import { ProductImage } from './api/entities/ProductImage';
import { ProductSize } from './api/entities/ProductSize';
import { ShippingAddress } from './api/entities/ShippingAddress';
import { UserAddress } from './api/entities/UserAddress';
import { Wishlist } from './api/entities/Wishlist';
import { ContactMessage } from './api/entities/ContactMessage';
import { Brand } from './api/entities/Brand';
import { AdminAuditLog } from './api/entities/AdminAuditLog';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  synchronize: false,
  logging: env.NODE_ENV === 'development',
  entities: [
    Product,
    User,
    Order,
    OrderItem,
    Category,
    Size,
    ProductImage,
    ProductSize,
    ShippingAddress,
    UserAddress,
    Wishlist,
    ContactMessage,
    Brand,
    AdminAuditLog,
  ],
  migrations: [env.NODE_ENV === 'production' ? './dist/migrations/*.js' : './src/migrations/*.ts'],
  subscribers: [],
});
