import { Request, Response } from 'express';
import { AppDataSource } from '../../data-source';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../entities/User';

export class OrderController {
  private orderRepository = AppDataSource.getRepository(Order);
  private productRepository = AppDataSource.getRepository(Product);
  private orderItemRepository = AppDataSource.getRepository(OrderItem);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Retrieves a list of all orders, including their items and associated user.
   */
  async getAll(req: Request, res: Response) {
    try {
      const orders = await this.orderRepository.find({ relations: ['user', 'items', 'items.product'] });
      return res.json(orders);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: 'Error fetching orders', error: message });
    }
  }

  /**
   * Retrieves a single order by its ID, including items and user.
   */
  async getOne(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (typeof id !== 'string') {
        return res.status(400).json({ message: 'Invalid ID format' });
      }
      const order = await this.orderRepository.findOne({
        where: { id },
        relations: ['user', 'items', 'items.product']
      });
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      return res.json(order);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: 'Error fetching order', error: message });
    }
  }

  /**
   * Creates a new order.
   * It handles stock reduction and calculates the total amount in a transaction.
   */
  async create(req: Request, res: Response) {
    const { userId, items } = req.body; // items: [{ productId, quantity }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item.' });
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      let user: User | null = null;
      if (userId) {
        user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
          throw new Error(`User with ID ${userId} not found.`);
        }
      }

      for (const item of items) {
        const product = await this.productRepository.findOneBy({ id: item.productId });
        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found.`);
        }
        if (product.stock < item.quantity) {
          throw new Error(`Not enough stock for product ${product.name}.`);
        }

        const itemTotalPrice = product.price_cents * item.quantity;
        totalAmount += itemTotalPrice;

        const newOrderItem = this.orderItemRepository.create({
          product: product,
          quantity: item.quantity,
          unit_price: product.price_cents,
          total_price: itemTotalPrice,
        });
        orderItems.push(newOrderItem);

        product.stock -= item.quantity;
        await queryRunner.manager.save(product);
      }

      const newOrder = this.orderRepository.create({
        user: user,
        items: orderItems,
        total_amount: totalAmount,
        currency: 'BRL',
        idempotency_key: uuidv4(),
        status: 'PENDING',
      });

      // The 'cascade: true' option in Order.items will save the orderItems automatically.
      const savedOrder = await queryRunner.manager.save(newOrder);

      await queryRunner.commitTransaction();

      return res.status(201).json(savedOrder);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: 'Error creating order', error: message });
    } finally {
      await queryRunner.release();
    }
  }
}
