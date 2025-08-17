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
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly redisService: RedisService,
  ) { }

  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    try {
      const order = new this.orderModel({ ...createOrderDto, userId });
      await order.save();
      await this.redisService.del(`orders:user:${userId}`);
      await this.redisService.del(`orders:all`);
      return order;
    }
    catch (err) { throw new BadRequestException(err.message) }

  }

  async findOrdersByUserId(userId: string) {
    const cacheKey = `orders:user:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const orders = await this.orderModel.find({ userId }).lean();
    await this.redisService.set(cacheKey, JSON.stringify(orders), 60);
    return orders;
  }

  async findOrderById(orderId: string) {
    const cacheKey = `order:${orderId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const order = await this.orderModel.findById(orderId).lean();
    if (order) {
      await this.redisService.set(cacheKey, JSON.stringify(order), 60);
    }
    return order;
  }

  async findAllOrders() {
    const cacheKey = `orders:all`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const orders = await this.orderModel.find().lean();
    await this.redisService.set(cacheKey, JSON.stringify(orders), 60);
    return orders;
  }

  async updateOrderStatus(orderId: string, status: string) {
    const order = await this.orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true },
    );
    if (order) {
      await this.redisService.del(`order:${orderId}`);
      await this.redisService.del(`orders:user:${order.userId}`);
      await this.redisService.del(`orders:all`);
    }
    return order;
  }

  async cancelOrder(orderId: string) {
    const order = await this.orderModel.findByIdAndUpdate(
      orderId,
      { status: 'cancelled' },
      { new: true },
    );
    if (order) {
      await this.redisService.del(`order:${orderId}`);
      await this.redisService.del(`orders:user:${order.userId}`);
      await this.redisService.del(`orders:all`);
    }
    return order;
  }

  async deleteOrder(orderId: string) {
    const order = await this.orderModel.findByIdAndDelete(orderId);
    if (order) {
      await this.redisService.del(`order:${orderId}`);
      await this.redisService.del(`orders:user:${order.userId}`);
      await this.redisService.del(`orders:all`);
    }
    return order;
  }

}
