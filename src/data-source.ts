import 'reflect-metadata';
import path from 'path';
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
import { Status } from './api/entities/Status';
import { Brand } from './api/entities/Brand';
import { AdminAuditLog } from './api/entities/AdminAuditLog';
import { OrderStatusHistory } from './api/entities/OrderStatusHistory';
import { EmailVerification } from './api/entities/EmailVerification';
import { Coupon } from './api/entities/Coupon';
import { CouponUserUsage } from './api/entities/CouponUserUsage';
import { Notification } from './api/entities/Notification';
import { CartItem } from './api/entities/CartItem';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  synchronize: true,
  migrationsRun: env.NODE_ENV === 'production',
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
    Status,
    Brand,
    AdminAuditLog,
    OrderStatusHistory,
    EmailVerification,
    Coupon,
    CouponUserUsage,
    Notification,
    CartItem,
  ],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  subscribers: [],
});
