import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment } from '../schemas/payment.schema';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { RedisService } from '@app/common-auth';
import axios from 'axios';
import * as crypto from 'crypto';
import * as qs from 'qs';
import { format } from 'date-fns';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);
    constructor(
        @InjectModel(Payment.name) private paymentModel: Model<Payment>,
        private configService: ConfigService,
        private readonly httpService: HttpService,
    ) { }


    // handle Vnpay payment info on docs
    private _sortObject(obj: any): any {
        const sorted: any = {};
        const str: string[] = [];
        let key: any;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                str.push(encodeURIComponent(key));
            }
        }
        str.sort();
        for (key = 0; key < str.length; key++) {
            sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
        }
        return sorted;
    }

    async createVnpayPaymentUrl(ipAddr: string, amountUsd: number, orderId: string, userId: string): Promise<string> {
        process.env.TZ = 'Asia/Ho_Chi_Minh';

        const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE');
        const secretKey = this.configService.get<string>('VNPAY_HASH_SECRET');
        let vnpUrl = this.configService.get<string>('VNPAY_URL');
        const returnUrl = this.configService.get<string>('VNPAY_RETURN_URL');

        if (!tmnCode || !secretKey || !vnpUrl) {
            this.logger.error('VNPAY configuration is missing in .env file');
            throw new InternalServerErrorException('VNPAY configuration is missing.');
        }

        const exchangeRate = 25000;
        const amountVnd = Math.round(amountUsd * exchangeRate);

        const createDate = format(new Date(), 'yyyyMMddHHmmss');

        let vnp_Params: any = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = `Thanh toán đơn hàng ${orderId}`;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amountVnd * 100;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;
        vnp_Params['vnp_BankCode'] = 'NCB';
        vnp_Params['vnp_ReturnUrl'] = returnUrl;

        vnp_Params = this._sortObject(vnp_Params);
        const signData = qs.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        vnp_Params['vnp_SecureHash'] = signed;
        vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

        await this.paymentModel.create({
            orderId,
            amount: amountVnd,
            userId,
            status: 'PENDING',
            provider: 'VNPAY',
            createdAt: new Date(),
        });

        this.logger.log(`Created VNPAY URL: ${vnpUrl}`);
        return vnpUrl;
    }
    async handleVnpayUrl(responseCode: string, orderId: string) {
        if (responseCode === '00') {
            await this.paymentModel.updateOne(
                { orderId },
                { status: 'SUCCESS' },
            );
            const method = 'VNPAY'
            const url = `http://order-service:3000/orders/${orderId}/${method}`
            await this.httpService.get(url);
        } else {
            await this.paymentModel.updateOne(
                { orderId },
                { status: 'FAILED' },
            );
            this.logger.log("failed")
        }

        return { responseCode }
    }

    async createMomoPayment(orderId: string, amountUsd: number, userId: string) {
        const partnerCode = this.configService.get<string>('MOMO_PARTNER_CODE');
        const accessKey = this.configService.get<string>('MOMO_ACCESS_KEY');
        const secretKey = this.configService.get<string>('MOMO_SECRET_KEY');
        const endpoint = this.configService.get<string>('MOMO_API_ENDPOINT');
        const redirectUrl = this.configService.get<string>('MOMO_REDIRECT_URL');
        const ipnUrl = this.configService.get<string>('MOMO_IPN_URL');

        if (!partnerCode || !accessKey || !secretKey || !endpoint || !redirectUrl || !ipnUrl) {
            throw new InternalServerErrorException('Missing MoMo environment configuration');
        }


        const exchangeRate = 25000;
        const amountVnd = Math.round(amountUsd * exchangeRate);

        this.logger.log(`UserId: ${userId}`);
        this.logger.log(`Amount USD: ${amountUsd}, Amount VND: ${amountVnd}`);

        const requestId = `${partnerCode}${Date.now()}`;
        const orderInfo = `Thanh toan don hang ${orderId}`;
        const requestType = 'payWithMethod';
        const extraData = '';

        // Signature theo docs
        const rawSignature =
            `accessKey=${accessKey}&amount=${amountVnd}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');

        const requestBody: any = {
            partnerCode,
            partnerName: 'Test',
            storeId: 'MomoTestStore',
            requestId,
            amount: String(amountVnd),
            orderId,
            orderInfo,
            redirectUrl,
            ipnUrl,
            lang: 'vi',
            requestType,
            autoCapture: true,
            extraData,
            signature,
        };

        try {
            const response = await axios.post(endpoint, requestBody, {
                headers: { 'Content-Type': 'application/json' },
            });

            this.logger.log(`Momo response: ${JSON.stringify(response.data)}`);

            await this.paymentModel.create({
                orderId,
                amount: amountVnd,
                userId,
                status: 'PENDING',
                provider: 'MOMO',
                createdAt: new Date(),
            });

            const url = response.data.payUrl;
            return url;
        } catch (error) {
            const errData = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            this.logger.error(`Momo payment creation failed: ${errData}`, error.stack);
            throw new InternalServerErrorException('Create Momo payment failed');
        }
    }

    async handleMomoURL(resultCode: string, orderId: string) {

        if (resultCode === '0') {
            await this.paymentModel.updateOne(
                { orderId },
                { status: 'SUCCESS' },
            );
            const method = 'MOMO'
            const url = `http://order-service:3000/orders/${orderId}/${method}`
            await this.httpService.get(url);
        } else {
            await this.paymentModel.updateOne(
                { orderId },
                { status: 'FAILED' },
            );
            this.logger.log("failed")
        }
        return { resultCode };
    }

    async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
        return this.paymentModel.findOne({ orderId: new Types.ObjectId(orderId) }).exec();
    }

    async deleteAllPayments(): Promise<{ acknowledged: boolean; deletedCount: number }> {
        try {
            this.logger.warn('Attempting to delete ALL payment records from the database. This action is irreversible.');
            const result = await this.paymentModel.deleteMany({}).exec();
            this.logger.log(`Successfully deleted ${result.deletedCount} payment records.`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to delete all payment records: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to delete all payment records.');
        }
    }

}