import { Request, Response } from 'express';
import { AppDataSource } from '../../data-source';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { v4 as uuidv4 } from 'uuid';

export class OrderController {
  private orderRepository = AppDataSource.getRepository(Order);
  private productRepository = AppDataSource.getRepository(Product);
  private orderItemRepository = AppDataSource.getRepository(OrderItem);

  /**
   * Retrieves a list of all orders, including their items and associated user.
   * @param req Express request object.
   * @param res Express response object.
   */
  async getAll(req: Request, res: Response) {
    try {
      const orders = await this.orderRepository.find({ relations: ['user', 'items', 'items.product'] });
      return res.json(orders);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching orders', error });
    }
  }

  /**
   * Retrieves a single order by its ID, including items and user.
   * @param req Express request object containing the order ID as a parameter.
   * @param res Express response object.
   */
  async getOne(req: Request, res: Response) {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: req.params.id },
        relations: ['user', 'items', 'items.product']
      });
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      return res.json(order);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching order', error });
    }
  }

  /**
   * Creates a new order.
   * It handles stock reduction and calculates the total amount in a transaction.
   * @param req Express request object containing order details in the body.
   * @param res Express response object.
   */
  async create(req: Request, res: Response) {
    const { userId, items } = req.body; // items: [{ productId, quantity }]

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item.' });
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      for (const item of items) {
        const product = await this.productRepository.findOneBy({ id: item.productId });
        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found.`);
        }
        if (product.stock < item.quantity) {
          throw new Error(`Not enough stock for product ${product.name}.`);
        }

        totalAmount += product.price * item.quantity;

        const newOrderItem = this.orderItemRepository.create({
          product: product,
          quantity: item.quantity,
          price: product.price
        });
        orderItems.push(newOrderItem);

        // Optimistically reduce stock
        product.stock -= item.quantity;
        await queryRunner.manager.save(product);
      }

      const newOrder = this.orderRepository.create({
        user: userId ? { id: userId } : null,
        items: orderItems,
        total_amount: totalAmount,
        currency: 'BRL', // Assuming BRL, could be part of request
        idempotency_key: uuidv4(), // Basic idempotency
        status: 'PENDING',
      });

      // Save order items first, linking them to the new order
      for (const item of orderItems) {
        item.order = newOrder;
        await queryRunner.manager.save(item);
      }

      const savedOrder = await queryRunner.manager.save(newOrder);

      await queryRunner.commitTransaction();

      return res.status(201).json(savedOrder);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      return res.status(500).json({ message: 'Error creating order', error: error.message });
    } finally {
      await queryRunner.release();
    }
  }
}
