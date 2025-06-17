import { Injectable, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment } from '../schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '@app/common-auth';
import * as qs from 'qs';
@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);
    constructor(
        @InjectModel(Payment.name) private paymentModel: Model<Payment>,
        private configService: ConfigService,
        private httpService: HttpService,
        private redisService: RedisService,
    ) { }

    private _formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }

    private _generateVnpayHash(params: any, secretKey: string): string {

        const sortedParams = Object.keys(params)
            .sort()
            .reduce((obj, key) => {
                obj[key] = params[key];
                return obj;
            }, {});
        const signData = qs.stringify(sortedParams, { encode: false });

        this.logger.log(`[Hashing] Generating hash from data string: "${signData}"`);
        return createHmac('sha512', secretKey).update(signData).digest('hex');
    }

    async createVnpayPaymentUrl(
        userId: string,
        createPaymentDto: CreatePaymentDto,
        authToken: string,
    ): Promise<string> {
        const { orderId } = createPaymentDto;
        const orderUrl = `http://order-service:3000/orders/${orderId}`;
        let orderData: any;
        try {
            const response = await firstValueFrom(
                this.httpService.get<any>(orderUrl, {
                    headers: { 'Authorization': authToken },
                }),
            );
            orderData = response.data;
            if (orderData.status !== 'pending') {
                throw new BadRequestException('Order is not in a payable state.');
            }
        } catch (error) {
            this.logger.error(`Error fetching order ${orderId} for payment`, error.response?.data || error.message);
            throw new BadRequestException('Order does not exist or payment cannot be created.');
        }

        const vnpUrl = this.configService.get<string>('VNPAY_URL');
        const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE');
        const secretKey = this.configService.get<string>('VNPAY_HASH_SECRET');
        const returnUrl = this.configService.get<string>('VNPAY_RETURN_URL');

        if (!vnpUrl || !tmnCode || !secretKey || !returnUrl) {
            throw new InternalServerErrorException('VNPAY configuration is missing.');
        }

        const uniqueTxnId = `${orderId}_${Date.now()}`;
        const newPayment = new this.paymentModel({
            orderId: new Types.ObjectId(orderId),
            userId: new Types.ObjectId(userId),
            amount: orderData.totalPrice,
            status: 'pending',
            transactionId: uniqueTxnId,
        });
        await newPayment.save();

        const createDate = this._formatDate(new Date());
        const ipAddr = '127.0.0.1';

        let vnp_Params: any = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = `Thanh toan don hang ${orderId}`;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = orderData.totalPrice * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;

        const secureHash = this._generateVnpayHash(vnp_Params, secretKey);
        vnp_Params['vnp_SecureHash'] = secureHash;

        const paymentUrl = `${vnpUrl}?${new URLSearchParams(vnp_Params).toString()}`;
        this.logger.log(`Created VNPAY URL for order ${orderId}`);
        return paymentUrl;
    }

    async handleVnpayWebhook(query: any): Promise<{ RspCode: string; Message: string }> {
        this.logger.debug('Received VNPAY Webhook Query:', query);

        const secureHash = query['vnp_SecureHash'];
        const tmnCodeFromVnPay = query['vnp_TmnCode'];
        const secretKey = this.configService.get<string>('VNPAY_HASH_SECRET');
        const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE');

        if (!secretKey || tmnCode !== tmnCodeFromVnPay) {
            this.logger.error(`IPN Error: Invalid TmnCode. Expected ${tmnCode}, got ${tmnCodeFromVnPay}`);
            return { RspCode: '02', Message: 'Invalid TmnCode' };
        }

        delete query['vnp_SecureHash'];
        delete query['vnp_SecureHashType'];

        const checkSum = this._generateVnpayHash(query, secretKey);
        if (secureHash !== checkSum) {
            this.logger.error(`IPN Error: Wrong signature.`);
            return { RspCode: '97', Message: 'Wrong signature' };
        }

        const orderId = query['vnp_TxnRef'];
        const responseCode = query['vnp_ResponseCode'];
        const amountFromVnPay = parseInt(query['vnp_Amount']) / 100;

        const payment = await this.paymentModel.findOne({ transactionId: orderId }).exec();

        if (!payment) {
            this.logger.error(`IPN Error: Payment record not found for orderId ${orderId}`);
            return { RspCode: '01', Message: 'Order not found' };
        }
        if (payment.amount !== amountFromVnPay) {
            this.logger.error(`IPN Error: Invalid amount for order ${orderId}. Expected ${payment.amount}, got ${amountFromVnPay}`);
            return { RspCode: '04', Message: 'Invalid amount' };
        }
        if (payment.status !== 'pending') {
            this.logger.warn(`IPN Info: Order ${orderId} already processed with status ${payment.status}`);
            return { RspCode: '02', Message: 'Order already confirmed or cancelled' };
        }

        let eventType = '';
        if (responseCode === '00') {
            payment.status = 'completed';
            eventType = 'payment_completed';
        } else {
            payment.status = 'failed';
            eventType = 'payment_failed';
        }

        payment.gatewayTransactionId = query['vnp_TransactionNo'];
        payment.bankCode = query['vnp_BankCode'];
        const payDate = query['vnp_PayDate'];
        payment.payDate = new Date(
            `${payDate.substring(0, 4)}-${payDate.substring(4, 6)}-${payDate.substring(6, 8)}T${payDate.substring(8, 10)}:${payDate.substring(10, 12)}:${payDate.substring(12, 14)}Z`
        );
        payment.gatewayResponse = query;

        await payment.save();

        await this.redisService.getClient().xadd(
            'payment_events_stream', '*',
            'eventType', eventType,
            'payload', JSON.stringify({
                orderId: payment.orderId.toString(),
                paymentId: payment._id.toString(),
            }),
        );
        this.logger.log(`Payment for order ${orderId} processed with status '${payment.status}'. Event published.`);
        return { RspCode: '00', Message: 'Confirm Success' };
    }

    async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
        return this.paymentModel.findOne({ orderId: new Types.ObjectId(orderId) }).exec();
    }
}