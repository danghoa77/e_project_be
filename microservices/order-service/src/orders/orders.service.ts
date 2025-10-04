import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { Order } from '../schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { RedisService, MailerService } from '@app/common-auth';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as moment from "moment";
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly redisService: RedisService,
    private readonly mailerService: MailerService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
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

  async changePaymentMethod(orderId: string, paymentMethod: 'CASH' | 'VNPAY' | 'MOMO') {
    try {
      const order = await this.orderModel.findById(orderId);
      if (!order) {
        throw new Error(`Order with id ${orderId} not found`);
      }
      order.paymentMethod = paymentMethod;
      order.status = 'confirmed';
      const res = await order.save();
      if (res) {
        const order = await this.orderModel.findById(orderId).lean();
        if (!order) {
          throw new NotFoundException(`Order with id ${orderId} not found`);
        }
        const user = order.userId
        const url = `http://user-service:3000/users/${user}`;
        const res = await firstValueFrom(this.httpService.get(url));
        const email = res.data.email;
        const name = res.data.name;
        await this.mailerService.sendMail({
          to: email,
          subject: 'Welcome to Our Service',
          html: `<p>Dear ${name},</p><p>Your order has been confirmed, please check your phone for a call from the delivery unit</p>
          <p>Thank you for order products from our service</p>`,
          from: this.configService.get<string>('MAIL_FROM') || '',
        });
        await this.redisService.del(`order:${orderId}`);
        return order;
      }

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

  async getDashboardStats() {
    const now = new Date();

    const startOfWeek = moment(now).startOf("isoWeek").toDate();
    const endOfWeek = moment(now).endOf("isoWeek").toDate();

    const startOfMonth = moment(now).startOf("month").toDate();
    const endOfMonth = moment(now).endOf("month").toDate();

    const [weekly, monthly, overview] = await Promise.all([
      this.orderModel.aggregate([
        {
          $match: {
            status: "confirmed",
            createdAt: { $gte: startOfWeek, $lte: endOfWeek },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$totalPrice" },
          },
        },
      ]),

      this.orderModel.aggregate([
        {
          $match: {
            status: "confirmed",
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$totalPrice" },
          },
        },
      ]),

      this.orderModel.aggregate([
        { $match: { status: "confirmed" } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$totalPrice" },
          },
        },
      ]),
    ]);

    return {
      overview: overview[0] || { totalOrders: 0, totalRevenue: 0 },
      weekly: weekly[0] || { totalOrders: 0, totalRevenue: 0 },
      monthly: monthly[0] || { totalOrders: 0, totalRevenue: 0 },
    };
  }

  async getTopCategories(limit = 5) {
    const topCategories = await this.orderModel.aggregate([
      { $match: { status: "confirmed" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.categoryId",
          totalQuantity: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "categories",
          let: { cid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: "$_id" }, { $toString: "$$cid" }]
                }
              }
            },
            { $project: { name: 1 } }
          ],
          as: "category"
        }
      },
      { $unwind: "$category" },
      {
        $project: {
          _id: 0,
          name: "$category.name",
          totalQuantity: 1
        }
      }
    ]);


    const labels = topCategories.map(c => c.name);
    const data = topCategories.map(c => c.totalQuantity);

    return { labels, data };
  }

  async topProducts(limit = 5) {
    try {
      const agg = await this.orderModel.aggregate([
        { $match: { status: "confirmed" } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            totalSold: { $sum: "$items.quantity" },
            nameFromOrder: { $first: "$items.name" },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "products",
            let: { pid: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [{ $toString: "$_id" }, { $toString: "$$pid" }],
                  },
                },
              },
              {
                $project: {
                  name: 1,
                  images: 1,
                  variants: 1,
                },
              },
            ],
            as: "product",
          },
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            productId: "$_id",
            name: { $ifNull: ["$product.name", "$nameFromOrder"] },
            totalSold: 1,
            image: {
              $let: {
                vars: { firstImage: { $arrayElemAt: ["$product.images", 0] } },
                in: { $ifNull: ["$$firstImage.url", null] },
              },
            },

            price: {
              $let: {
                vars: { firstVariant: { $arrayElemAt: ["$product.variants", 0] } },
                in: {
                  $let: {
                    vars: { firstSize: { $arrayElemAt: ["$$firstVariant.sizes", 0] } },
                    in: { $ifNull: ["$$firstSize.price", null] },
                  },
                },
              },
            },

            salePrice: {
              $let: {
                vars: { firstVariant: { $arrayElemAt: ["$product.variants", 0] } },
                in: {
                  $let: {
                    vars: { firstSize: { $arrayElemAt: ["$$firstVariant.sizes", 0] } },
                    in: { $ifNull: ["$$firstSize.salePrice", null] },
                  },
                },
              },
            },
          },
        },
      ]);

      const products = agg.map((p) => ({
        productId: p.productId?.toString ? p.productId.toString() : p.productId,
        name: p.name,
        image: p.image || null,
        price: p.price ?? null,
        salePrice: p.salePrice ?? null,
        totalSold: p.totalSold ?? 0,
      }));

      return {
        labels: products.map((p) => p.name),
        data: products.map((p) => p.totalSold),
        products,
      };
    } catch (err) {
      throw err;
    }
  }

}
