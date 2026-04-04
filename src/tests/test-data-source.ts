import { DataSource } from 'typeorm';
import { Product } from '../api/entities/Product';
import { User } from '../api/entities/User';
import { Order } from '../api/entities/Order';
import { OrderItem } from '../api/entities/OrderItem';
import { Category } from '../api/entities/Category';
import { Size } from '../api/entities/Size';
import { ProductImage } from '../api/entities/ProductImage';
import { ProductSize } from '../api/entities/ProductSize';
import { ShippingAddress } from '../api/entities/ShippingAddress';
import { UserAddress } from '../api/entities/UserAddress';
import { Wishlist } from '../api/entities/Wishlist';
import { ContactMessage } from '../api/entities/ContactMessage';
import { Brand } from '../api/entities/Brand';
import { AdminAuditLog } from '../api/entities/AdminAuditLog';

export const TestDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: 'order_db_test',
  // dropSchema is handled manually in setup.ts for better reliability with Enums
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
  synchronize: true,
  dropSchema: true,
  logging: false,
});
