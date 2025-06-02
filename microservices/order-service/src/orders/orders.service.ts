// order-service/src/orders/orders.service.ts
import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderItem, ShippingAddress } from '../schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CartsService } from '../carts/carts.service';
import { RedisService } from '@app/common-auth';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose'; // Decorator mới

@Injectable()
export class OrdersService implements OnModuleInit {
    constructor(
        @InjectModel(Order.name) private orderModel: Model<Order>,
        private cartsService: CartsService, // Inject CartsService để lấy giỏ hàng
        private httpService: HttpService, // Để gọi Product Service
        private redisService: RedisService,
        @InjectConnection() private readonly connection: Connection, // Inject Mongoose connection
    ) { }

    async onModuleInit() {
        // Khởi tạo Redis Stream consumer khi module khởi động
        await this.setupRedisStreamConsumer();
    }

    private async setupRedisStreamConsumer() {
        const streamName = 'payment_events_stream';
        const groupName = 'order_service_group';

        const redisClient = this.redisService.getClient();

        try {
            await redisClient.xgroup('CREATE', streamName, groupName, '$', 'MKSTREAM');
            console.log(`Redis Stream group '${groupName}' created for stream '${streamName}'`);
        } catch (err) {
            if (err.message.includes('BUSYGROUP')) {
                console.log(`Redis Stream group '${groupName}' already exists for stream '${streamName}'`);
            } else {
                console.error('Failed to create Redis Stream group:', err);
            }
        }

        // Lắng nghe sự kiện từ Redis Stream
        const consumer = async () => {
            while (true) {
                try {
                    const response = await redisClient.xreadgroup(
                        'GROUP', groupName, 'consumer1', // Tên consumer (có thể là tên instance của service)
                        'BLOCK', 0, // Block mãi mãi cho đến khi có tin nhắn
                        'STREAMS', streamName, '>', // Lắng nghe từ tin nhắn mới nhất
                    );

                    if (response) {
                        for (const streamData of response as [string, any[]][]) {
                            const [stream, messages] = streamData;
                            for (const message of messages) {
                                const [messageId, data] = message;
                                const eventType = data[1]; // Ví dụ: 'eventType'
                                const eventPayload = JSON.parse(data[3]); // Ví dụ: 'payload'

                                console.log(`Received event '${eventType}' from stream '${stream}' with ID '${messageId}'`);
                                console.log('Payload:', eventPayload);

                                if (eventType === 'payment_completed') {
                                    await this.handlePaymentCompleted(eventPayload);
                                } else if (eventType === 'payment_failed') {
                                    await this.handlePaymentFailed(eventPayload);
                                }

                                // Đánh dấu tin nhắn đã được xử lý
                                await redisClient.xack(streamName, groupName, messageId);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error processing Redis Stream message:', error);
                    // Tạm dừng một chút trước khi thử lại để tránh spam log
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        };
        consumer(); // Bắt đầu consumer
    }

    private async handlePaymentCompleted(payload: any) {
        const { orderId, transactionId, amount, payDate } = payload;
        console.log(`Handling payment completed for Order ID: ${orderId}`);
        try {
            const order = await this.orderModel.findById(orderId).exec();
            if (!order) {
                console.warn(`Order ${orderId} not found for payment completion.`);
                return;
            }
            if (order.status === 'pending') {
                order.status = 'confirmed';
                // Bạn có thể lưu thêm thông tin thanh toán vào Order nếu muốn
                await order.save();
                console.log(`Order ${orderId} status updated to 'confirmed'.`);
                await this.redisService.del(`order:${orderId}`); // Xóa cache order
                await this.redisService.del(`orders:user:${order.userId}`); // Xóa cache orders của user
            }
        } catch (error) {
            console.error(`Error confirming order ${orderId} after payment:`, error);
        }
    }

    private async handlePaymentFailed(payload: any) {
        const { orderId } = payload;
        console.log(`Handling payment failed for Order ID: ${orderId}`);
        try {
            const order = await this.orderModel.findById(orderId).exec();
            if (!order) {
                console.warn(`Order ${orderId} not found for payment failed event.`);
                return;
            }
            if (order.status === 'pending') {
                order.status = 'cancelled'; // Hủy đơn hàng nếu thanh toán thất bại
                await order.save();
                console.log(`Order ${orderId} status updated to 'cancelled' due to failed payment.`);
                await this.redisService.del(`order:${orderId}`); // Xóa cache order
                await this.redisService.del(`orders:user:${order.userId}`); // Xóa cache orders của user
                // Cần hoàn lại stock cho sản phẩm nếu đơn hàng bị hủy sau khi đã giảm stock
                await this.revertProductStock(order.items);
            }
        } catch (error) {
            console.error(`Error cancelling order ${orderId} after failed payment:`, error);
        }
    }

    private async revertProductStock(items: OrderItem[]): Promise<void> {
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            for (const item of items) {
                // Gọi Product Service để tăng lại số lượng tồn kho
                const updateStockUrl = `http://product-service:3000/products/update-stock/${item.productId}`;
                await firstValueFrom(
                    this.httpService.patch(updateStockUrl, {
                        variantId: item.variantId,
                        quantity: item.quantity,
                        operation: 'increase' // Thêm operation để Product Service biết tăng hay giảm
                    }, {
                        headers: {
                            ...(session.id ? { 'X-Transaction-Session-Id': session.id.toString() } : {})
                        } // Truyền session ID nếu cần
                    })
                );
            }
            await session.commitTransaction();
            console.log('Product stock reverted successfully.');
        } catch (error) {
            await session.abortTransaction();
            console.error('Failed to revert product stock:', error);
            // Có thể cần cơ chế retry hoặc cảnh báo admin ở đây
        } finally {
            session.endSession();
        }
    }


    async createOrder(userId: Types.ObjectId, createOrderDto: CreateOrderDto): Promise<Order> {
        const session = await this.connection.startSession();
        session.startTransaction();

        try {
            const cart = await this.cartsService.getCartByUserId(userId);
            if (!cart || cart.items.length === 0) {
                throw new BadRequestException('Cart is empty. Please add products to cart.');
            }

            const orderItems: OrderItem[] = [];
            let totalPrice = 0;

            // 1. Duyệt qua các mặt hàng trong giỏ, kiểm tra tồn kho và lấy snapshot sản phẩm
            for (const cartItem of cart.items) {
                const productUrl = `http://product-service:3000/products/${cartItem.productId.toHexString()}`;
                let productData: any;
                try {
                    const response = await firstValueFrom(this.httpService.get(productUrl));
                    productData = response.data;
                } catch (error) {
                    throw new NotFoundException(`Product with ID ${cartItem.productId} does not exist.`);
                }

                const variant = productData.variants.find(v => v._id === cartItem.variantId);
                if (!variant) {
                    throw new BadRequestException(`Variant with ID ${cartItem.variantId} insufficient stock for product ${productData.name}.`);
                }
                if (variant.stock < cartItem.quantity) {
                    throw new BadRequestException(`Insufficient stock for product ${productData.name} (${variant.size} - ${variant.color}). Chỉ còn ${variant.stock} sản phẩm.`);
                }

                // Tạo OrderItem snapshot
                orderItems.push({
                    productId: cartItem.productId,
                    variantId: cartItem.variantId,
                    name: productData.name,
                    size: variant.size,
                    color: variant.color,
                    price: variant.salePrice > 0 ? variant.salePrice : variant.price, // Ưu tiên giá khuyến mãi
                    quantity: cartItem.quantity,
                });
                totalPrice += (variant.salePrice > 0 ? variant.salePrice : variant.price) * cartItem.quantity;
            }

            // 2. Giảm số lượng tồn kho trong Product Service (atomically)
            for (const item of orderItems) {
                const updateStockUrl = `http://product-service:3000/products/update-stock/${item.productId}`;
                await firstValueFrom(
                    this.httpService.patch(updateStockUrl, {
                        variantId: item.variantId,
                        quantity: item.quantity,
                        operation: 'decrease' // Thêm operation để Product Service biết tăng hay giảm
                    }, {
                        headers: {
                            ...(session.id ? { 'X-Transaction-Session-Id': session.id.toString() } : {})
                        } // Truyền session ID nếu cần
                    })
                );
            }

            // 3. Tạo đơn hàng
            const newOrder = new this.orderModel({
                userId,
                items: orderItems,
                totalPrice,
                shippingAddress: createOrderDto.shippingAddress,
                status: 'pending', // Trạng thái pending chờ thanh toán
            });
            const createdOrder = await newOrder.save({ session }); // Lưu với session để transaction hoạt động

            // 4. Xóa giỏ hàng sau khi tạo đơn
            await this.cartsService.clearCart(userId); // Giỏ hàng sẽ được xóa trong cùng transaction nếu có

            await session.commitTransaction(); // Commit tất cả các thay đổi
            console.log(`Order ${createdOrder._id} created successfully.`);

            await this.redisService.del(`orders:user:${userId}`); // Xóa cache orders của user
            return createdOrder;
        } catch (error) {
            await session.abortTransaction(); // Rollback nếu có lỗi
            console.error('Failed to create order:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async findOrdersByUserId(userId: Types.ObjectId): Promise<Order[]> {
        const cachedOrders = await this.redisService.get(`orders:user:${userId.toHexString()}`);
        if (cachedOrders) {
            console.log('Orders from Redis cache');
            return JSON.parse(cachedOrders);
        }
        const orders = await this.orderModel.find({ userId }).sort({ createdAt: -1 }).exec();
        await this.redisService.set(`orders:user:${userId.toHexString()}`, JSON.stringify(orders), 60 * 5); // Cache 5 phút
        return orders;
    }

    async findOrderById(orderId: string): Promise<Order> {
        const cachedOrder = await this.redisService.get(`order:${orderId}`);
        if (cachedOrder) {
            console.log('Order from Redis cache');
            return JSON.parse(cachedOrder);
        }
        const order = await this.orderModel.findById(orderId).exec();
        if (!order) {
            throw new NotFoundException('Orders does not exist.');
        }
        await this.redisService.set(`order:${orderId}`, JSON.stringify(order), 60 * 5); // Cache 5 phút
        return order;
    }

    async findAllOrders(): Promise<Order[]> { // Chỉ dành cho Admin
        const cachedOrders = await this.redisService.get('orders:all');
        if (cachedOrders) {
            console.log('All orders from Redis cache');
            return JSON.parse(cachedOrders);
        }
        const orders = await this.orderModel.find().sort({ createdAt: -1 }).exec();
        await this.redisService.set('orders:all', JSON.stringify(orders), 60 * 5); // Cache 5 phút
        return orders;
    }

    async updateOrderStatus(orderId: string, status: 'confirmed' | 'shipped' | 'delivered' | 'cancelled'): Promise<Order> {
        const order = await this.orderModel.findById(orderId).exec();
        if (!order) {
            throw new NotFoundException('Order does not exist.');
        }
        order.status = status;
        const updatedOrder = await order.save();
        await this.redisService.del(`order:${orderId}`); // Xóa cache order
        await this.redisService.del(`orders:user:${order.userId}`); // Xóa cache orders của user
        await this.redisService.del('orders:all'); // Xóa cache tổng
        return updatedOrder;
    }
}