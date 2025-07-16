import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Order, OrderDocument, OrderItem } from '../schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CartsService } from '../carts/carts.service';
import { RedisService } from '@app/common-auth';

interface ProductVariant {
  _id: string;
  stock: number;
  price: number;
  salePrice: number;
  name: string;
  size: string;
  color: string;
}

interface ProductData {
  variants: ProductVariant[];
  name: string;
}

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly cartsService: CartsService,
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async onModuleInit() {
    // this.setupRedisStreamConsumer().catch(err => this.logger.error('Failed to setup Redis Stream Consumer', err));
  }

  // private async setupRedisStreamConsumer() { ... }
  // private async handlePaymentCompleted(payload: any) { ... }
  // private async revertProductStock(items: OrderItem[]): Promise<void> { ... }

  async createOrder(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderDocument> {
    const session = await this.connection.startSession();
    session.startTransaction();
    this.logger.log(`Starting transaction to create order for user ${userId}`);

    try {
      const cart = await this.cartsService.getCartByUserId(userId);
      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty.');
      }

      const orderItems: OrderItem[] = [];
      let totalPrice = 0;

      //check stock and calculate total price
      for (const cartItem of cart.items) {
        const productUrl = `http://product-service:3000/products/${cartItem.productId.toString()}`;
        const response = await firstValueFrom(
          this.httpService.get<ProductData>(productUrl),
        );
        const productData = response.data;
        const variant = productData.variants.find(
          (v) => v._id.toString() === cartItem.variantId,
        );

        if (!variant) {
          throw new BadRequestException(
            `Variant with ID ${cartItem.variantId} not found for product ${productData.name}.`,
          );
        }
        if (variant.stock < cartItem.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${productData.name} (${variant.size} - ${variant.color}). Only ${variant.stock} left.`,
          );
        }

        const itemPrice =
          variant.salePrice > 0 ? variant.salePrice : variant.price;
        orderItems.push({
          productId: new Types.ObjectId(cartItem.productId),
          variantId: cartItem.variantId,
          name: productData.name,
          size: variant.size,
          color: variant.color,
          price: itemPrice,
          quantity: cartItem.quantity,
        });
        totalPrice += itemPrice * cartItem.quantity;
      }

      await this._decreaseProductStock(orderItems);

      const newOrder = new this.orderModel({
        userId: new Types.ObjectId(userId),
        items: orderItems,
        totalPrice,
        shippingAddress: createOrderDto.shippingAddress,
        status: 'pending',
      });
      const createdOrder: OrderDocument = await newOrder.save({ session });
      this.logger.log(
        `Order ${(createdOrder._id as Types.ObjectId).toString()} created in DB for user ${userId}`,
      );

      await this.cartsService.clearCart(userId, session);
      this.logger.log(`Cart cleared for user ${userId} within transaction.`);

      await session.commitTransaction();
      this.logger.log(
        `Transaction committed for order ${(createdOrder._id as Types.ObjectId).toString()}`,
      );
      await this.redisService.del(`orders:user:${userId}`);
      return createdOrder;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Failed to create order for user ${userId}. Transaction aborted.`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    } finally {
      session.endSession();
    }
  }

  private async _decreaseProductStock(items: OrderItem[]): Promise<void> {
    this.logger.log(
      `Preparing to call ProductService to decrease stock for ${items.length} order items...`,
    );

    const stockUpdatePayload = {
      items: items.map((item) => ({
        productId: item.productId.toString(),
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    };

    const updateStockUrl =
      'http://product-service:3000/products/stock/decrease';

    try {
      await firstValueFrom(
        this.httpService.patch(updateStockUrl, stockUpdatePayload),
      );
      this.logger.log('Successfully called bulk stock decrease endpoint.');
    } catch (error) {
      this.logger.error(
        'Failed to decrease stock in Product Service.',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async findOrdersByUserId(userId: string): Promise<Order[]> {
    const cacheKey = `orders:user:${userId}`;
    const cachedOrders = await this.redisService.get(cacheKey);
    if (cachedOrders) {
      this.logger.log(`Orders for user ${userId} found in Redis cache.`);
      return JSON.parse(cachedOrders);
    }

    const orders = await this.orderModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
    await this.redisService.set(cacheKey, JSON.stringify(orders), 300);
    return orders;
  }

  async findOrderById(orderId: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} does not exist.`);
    }
    return order;
  }

  async findAllOrders(): Promise<Order[]> {
    return this.orderModel.find().sort({ createdAt: -1 }).exec();
  }

  async updateOrderStatus(
    orderId: string,
    status: 'confirmed' | 'shipped' | 'delivered' | 'cancelled',
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} does not exist.`);
    }
    order.status = status;
    const updatedOrder = await order.save();

    await this.redisService.del(`order:${orderId}`);
    await this.redisService.del(`orders:user:${order.userId.toString()}`);
    await this.redisService.del('orders:all');

    return updatedOrder;
  }
}
