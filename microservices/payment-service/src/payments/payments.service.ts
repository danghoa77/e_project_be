// payment-service/src/payments/payments.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment } from '../schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PaymentsService {
    constructor(
        @InjectModel(Payment.name) private paymentModel: Model<Payment>,
        private configService: ConfigService,
        private httpService: HttpService, // Để gọi Order Service lấy thông tin đơn hàng
        private redisService: RedisService,
    ) { }

    private generateVnPayHash(params: any): string {
        const secretKey = this.configService.get<string>('VNPAY_HASH_SECRET');
        if (!secretKey) {
            throw new Error('VNPAY_HASH_SECRET is not defined in configuration');
        }
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');
        const hmac = crypto.createHmac('sha512', secretKey);
        return hmac.update(sortedParams).digest('hex');
    }

    async createVnpayPaymentUrl(userId: Types.ObjectId, createPaymentDto: CreatePaymentDto): Promise<string> {
        const { orderId, amount } = createPaymentDto;

        // 1. Kiểm tra đơn hàng có tồn tại và đang ở trạng thái pending không
        const orderUrl = `http://order-service:3000/orders/${orderId}`;
        let orderData: any;
        try {
            const response = await firstValueFrom(this.httpService.get(orderUrl));
            orderData = response.data;
            if (orderData.status !== 'pending') {
                throw new BadRequestException('The order is not in payment status.');
            }
            if (orderData.totalPrice !== amount) {
                // Bảo mật hơn: luôn lấy amount từ Order Service để tránh giả mạo
                throw new BadRequestException('Payment amount does not match order.');
            }
        } catch (error) {
            console.error('Error fetching order for payment:', error.response?.data || error.message);
            throw new BadRequestException('Order does not exist or payment cannot be created.');
        }


        // 2. Tạo bản ghi payment trong MongoDB với trạng thái pending
        const newPayment = new this.paymentModel({
            orderId: new Types.ObjectId(orderId),
            userId,
            amount: orderData.totalPrice, // Sử dụng total price từ order
            status: 'pending',
        });
        await newPayment.save();

        const vnpUrl = this.configService.get<string>('VNPAY_URL');
        const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE');
        const returnUrl = this.configService.get<string>('VNPAY_RETURN_URL');

        const ipAddr = '127.0.0.1'; // Hoặc lấy IP thực từ request nếu cần
        const currCode = 'VND';
        const locale = 'vn';
        const orderInfo = `Thanh toan don hang ${orderId}`;
        const orderType = 'billpayment';
        const txnRef = new Date().getTime().toString(); // Mã giao dịch duy nhất

        let vnp_Params: any = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Amount'] = amount * 100; // VNPAY yêu cầu số tiền * 100 (đơn vị: xu)
        vnp_Params['vnp_CurrCode'] = currCode;
        vnp_Params['vnp_TxnRef'] = txnRef;
        vnp_Params['vnp_OrderInfo'] = orderInfo;
        vnp_Params['vnp_OrderType'] = orderType;
        vnp_Params['vnp_Locale'] = locale;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = new Date().toISOString().replace(/[:.-]/g, ''); // YYYYMMDDHHmmss

        // Sort parameters
        vnp_Params = Object.keys(vnp_Params)
            .sort()
            .reduce((obj, key) => {
                obj[key] = vnp_Params[key];
                return obj;
            }, {});

        const signData = Object.keys(vnp_Params)
            .map(key => `${key}=${encodeURIComponent(vnp_Params[key])}`)
            .join('&');

        const secureHash = this.generateVnPayHash(vnp_Params);

        const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`;

        // Lưu transactionId vào payment record
        newPayment.transactionId = txnRef;
        await newPayment.save();

        return paymentUrl;
    }

    async handleVnPayWebhook(query: any): Promise<any> {
        const secureHash = query['vnp_SecureHash'];
        delete query['vnp_SecureHash'];

        // Sắp xếp lại query params
        const sortedParams: any = Object.keys(query)
            .sort()
            .reduce((obj, key) => {
                obj[key] = query[key];
                return obj;
            }, {});

        const checkSum = this.generateVnPayHash(sortedParams);

        if (secureHash !== checkSum) {
            return { RspCode: '97', Message: 'Wrong signature.' };
        }

        const txnRef = query['vnp_TxnRef'];
        const responseCode = query['vnp_ResponseCode'];
        const amount = parseInt(query['vnp_Amount']) / 100; // Số tiền từ VNPAY (chia 100)
        const transactionId = query['vnp_TransactionNo'];
        const bankCode = query['vnp_BankCode'];
        const payDate = query['vnp_PayDate']; // YYYYMMDDHHmmss

        const payment = await this.paymentModel.findOne({ transactionId: txnRef }).exec();

        if (!payment) {
            return { RspCode: '01', Message: 'No transaction found.' };
        }

        if (payment.amount !== amount) {
            return { RspCode: '04', Message: 'Amount is not valid.' };
        }

        // Kiểm tra trạng thái đã xử lý trước đó chưa
        if (payment.status !== 'pending') {
            return { RspCode: '02', Message: 'Transaction has been processed.' };
        }

        // Cập nhật trạng thái thanh toán
        if (responseCode === '00') { // Thanh toán thành công
            payment.status = 'completed';
            payment.transactionId = transactionId;
            payment.bankCode = bankCode;
            payment.payDate = new Date(
                `${payDate.substring(0, 4)}-${payDate.substring(4, 6)}-${payDate.substring(6, 8)}T${payDate.substring(8, 10)}:${payDate.substring(10, 12)}:${payDate.substring(12, 14)}`
            );
            payment.gatewayResponse = query;

            await payment.save();

            // Gửi sự kiện thanh toán thành công qua Redis Stream
            await this.redisService.getClient().xadd(
                'payment_events_stream', '*',
                'eventType', 'payment_completed',
                'payload', JSON.stringify({
                    orderId: payment.orderId.toHexString(),
                    paymentId: (payment._id as Types.ObjectId).toHexString(),
                    transactionId: payment.transactionId,
                    amount: payment.amount,
                    payDate: payment.payDate,
                }),
            );
            console.log(`Payment for order ${payment.orderId} completed. Event published to Redis Stream.`);

            return { RspCode: '00', Message: 'Confirm Success' };
        } else { // Thanh toán thất bại hoặc lỗi
            payment.status = 'failed';
            payment.gatewayResponse = query;
            await payment.save();

            // Gửi sự kiện thanh toán thất bại qua Redis Stream
            await this.redisService.getClient().xadd(
                'payment_events_stream', '*',
                'eventType', 'payment_failed',
                'payload', JSON.stringify({
                    orderId: payment.orderId.toHexString(),
                    paymentId: (payment._id as Types.ObjectId).toHexString(),
                    responseCode,
                    transactionId: payment.transactionId, // Lỗi có thể không có transactionId thực
                }),
            );
            console.log(`Payment for order ${payment.orderId} failed. Event published to Redis Stream.`);
            return { RspCode: '00', Message: 'Confirm Success' }; // Vẫn trả về 00 cho VNPAY nếu đã xử lý
        }
    }

    async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
        return this.paymentModel.findOne({ orderId: new Types.ObjectId(orderId) }).exec();
    }
}