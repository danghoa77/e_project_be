import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
  ForbiddenException,
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
  ) { }

  async onModuleInit() { }

  async createOrder(userId: string, createOrderDto: CreateOrderDto): Promise<OrderDocument> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const cart = await this.cartsService.getCartByUserId(userId);
      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty.');
      }

      const orderItems: OrderItem[] = [];
      let totalPrice = 0;

      for (const cartItem of cart.items) {
        const productUrl = `http://product-service:3000/products/${cartItem.productId.toString()}`;
        const response = await firstValueFrom(this.httpService.get<ProductData>(productUrl));
        const productData = response.data;
        const variant = productData.variants.find(v => v._id.toString() === cartItem.variantId);

        if (!variant) {
          throw new BadRequestException(`Variant with ID ${cartItem.variantId} not found for product ${productData.name}.`);
        }
        if (variant.stock < cartItem.quantity) {
          throw new BadRequestException(`Insufficient stock for ${productData.name} (${variant.size} - ${variant.color}). Only ${variant.stock} left.`);
        }

        const itemPrice = variant.salePrice > 0 ? variant.salePrice : variant.price;
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

      await this.decreaseProductStock(orderItems);

      const newOrder = new this.orderModel({
        userId: new Types.ObjectId(userId),
        items: orderItems,
        totalPrice,
        shippingAddress: createOrderDto.shippingAddress,
        status: 'pending',
      });

      const createdOrder = await newOrder.save({ session });
      await this.cartsService.clearCart(userId, session);
      await session.commitTransaction();

      await this.redisService.del(`orders:user:${userId}`);
      return createdOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  private async decreaseProductStock(items: OrderItem[]): Promise<void> {
    const stockUpdatePayload = {
      items: items.map(item => ({
        productId: item.productId.toString(),
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    };
    const updateStockUrl = 'http://product-service:3000/products/stock/decrease';
    await firstValueFrom(this.httpService.patch(updateStockUrl, stockUpdatePayload));
  }

  private async increaseProductStock(items: OrderItem[]): Promise<void> {
    const stockUpdatePayload = {
      items: items.map(item => ({
        productId: item.productId.toString(),
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    };
    const updateStockUrl = 'http://product-service:3000/products/stock/increase';
    await firstValueFrom(this.httpService.patch(updateStockUrl, stockUpdatePayload));
  }

  async findOrdersByUserId(userId: string): Promise<Order[]> {
    const cacheKey = `orders:user:${userId}`;
    const cachedOrders = await this.redisService.get(cacheKey);
    if (cachedOrders) {
      return JSON.parse(cachedOrders);
    }
    const orders = await this.orderModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).exec();
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

  async updateOrderStatus(orderId: string, status: 'confirmed' | 'shipped' | 'delivered' | 'cancelled'): Promise<OrderDocument> {
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

  async cancelOrder(orderId: string, userId: string, userRole: string): Promise<OrderDocument> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const order = await this.orderModel.findById(orderId).session(session);
      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found.`);
      }
      if (userRole !== 'admin' && order.userId.toHexString() !== userId) {
        throw new ForbiddenException('You do not have permission to perform this action.');
      }
      if (!['pending', 'confirmed'].includes(order.status)) {
        throw new BadRequestException(`Cannot cancel an order with status "${order.status}".`);
      }

      await this.increaseProductStock(order.items);
      order.status = 'cancelled';
      const updatedOrder = await order.save({ session });

      await session.commitTransaction();
      await this.redisService.del(`order:${orderId}`);
      await this.redisService.del(`orders:user:${order.userId.toString()}`);
      await this.redisService.del('orders:all');

      return updatedOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
