import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment } from '../schemas/payment.schema';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { RedisService } from '@app/common-auth';
import * as crypto from 'crypto';
import * as qs from 'qs';
import { format } from 'date-fns';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);
    constructor(
        @InjectModel(Payment.name) private paymentModel: Model<Payment>,
        private configService: ConfigService,
        private httpService: HttpService,
        private redisService: RedisService,
    ) { }

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

    createVnpayPaymentUrl(ipAddr: string, amount: number, bankCode: string, language: string, orderInfoPrefix: string): string {
        process.env.TZ = 'Asia/Ho_Chi_Minh';

        const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE');
        const secretKey = this.configService.get<string>('VNPAY_HASH_SECRET');
        let vnpUrl = this.configService.get<string>('VNPAY_URL');
        const returnUrl = this.configService.get<string>('VNPAY_RETURN_URL');

        if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
            this.logger.error('VNPAY configuration is missing in .env file');
            throw new InternalServerErrorException('VNPAY configuration is missing.');
        }

        const createDate = format(new Date(), 'yyyyMMddHHmmss');
        const orderId = format(new Date(), 'HHmmss');

        let locale = language;
        if (locale === null || locale === '') {
            locale = 'vn';
        }
        const currCode = 'VND';

        let vnp_Params: any = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = locale;
        vnp_Params['vnp_CurrCode'] = currCode;
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = `${orderInfoPrefix} ${orderId}`;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;
        if (bankCode !== null && bankCode !== '') {
            vnp_Params['vnp_BankCode'] = bankCode;
        }

        vnp_Params = this._sortObject(vnp_Params);
        const signData = qs.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        vnp_Params['vnp_SecureHash'] = signed;
        vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

        this.logger.log(`Created VNPAY URL: ${vnpUrl}`);
        return vnpUrl;
    }

    verifyVnpaySignature(vnpayParams: any): boolean {
        const secretKey = this.configService.get<string>('VNPAY_HASH_SECRET');
        if (!secretKey) {
            this.logger.error('VNPAY_HASH_SECRET is missing for signature verification.');
            return false;
        }

        const secureHash = vnpayParams['vnp_SecureHash'];
        delete vnpayParams['vnp_SecureHash'];
        delete vnpayParams['vnp_SecureHashType'];

        const sortedParams = this._sortObject(vnpayParams);
        const signData = qs.stringify(sortedParams, { encode: false });
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        if (secureHash === signed) {
            this.logger.log('VNPAY signature is valid.');
            return true;
        } else {
            this.logger.warn('VNPAY signature is invalid.');
            return false;
        }
    }

    async handleVnpayWebhook(query: any): Promise<{ RspCode: string; Message: string }> {
        this.logger.debug('Received VNPAY Webhook Query:', query);

        const tmnCodeFromVnPay = query['vnp_TmnCode'];
        const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE');

        if (tmnCode !== tmnCodeFromVnPay) {
            this.logger.error(`IPN Error: Invalid TmnCode. Expected ${tmnCode}, got ${tmnCodeFromVnPay}`);
            return { RspCode: '02', Message: 'Invalid TmnCode' };
        }

        const isSignatureValid = this.verifyVnpaySignature({ ...query });

        if (!isSignatureValid) {
            this.logger.error(`IPN Error: Wrong signature.`);
            return { RspCode: '97', Message: 'Wrong signature' };
        }

        const orderId = query['vnp_TxnRef'];
        const responseCode = query['vnp_ResponseCode'];
        const amountFromVnPay = parseInt(query['vnp_Amount'], 10) / 100;

        const payment = await this.paymentModel.findOne({ transactionId: orderId }).exec();

        if (!payment) {
            this.logger.error(`IPN Error: Payment record not found for transactionId ${orderId}`);
            return { RspCode: '01', Message: 'Order not found' };
        }
        if (payment.amount !== amountFromVnPay) {
            this.logger.error(`IPN Error: Invalid amount for transaction ${orderId}. DB: ${payment.amount}, VNPAY: ${amountFromVnPay}`);
            return { RspCode: '04', Message: 'Invalid amount' };
        }

        if (payment.status !== 'pending') {
            this.logger.warn(`IPN Info: Transaction ${orderId} already processed with status ${payment.status}`);
            return { RspCode: '00', Message: 'Order already confirmed' };
        }

        let eventType = '';
        if (responseCode === '00') {
            payment.status = 'completed';
            eventType = 'payment.completed';
        } else {
            payment.status = 'failed';
            eventType = 'payment.failed';
        }

        payment.gatewayTransactionId = query['vnp_TransactionNo'];
        payment.bankCode = query['vnp_BankCode'];
        const payDateStr = query['vnp_PayDate'];

        if (payDateStr && payDateStr.length === 14) {
            const year = payDateStr.substring(0, 4);
            const month = payDateStr.substring(4, 6);
            const day = payDateStr.substring(6, 8);
            const hour = payDateStr.substring(8, 10);
            const minute = payDateStr.substring(10, 12);
            const second = payDateStr.substring(12, 14);
            payment.payDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`);
        }
        payment.gatewayResponse = query;

        await payment.save();
        this.logger.log(`Payment for transaction ${orderId} updated to '${payment.status}'.`);

        try {
            await this.redisService.getClient().xadd(
                'payment_events_stream', '*',
                'eventType', eventType,
                'payload', JSON.stringify({
                    orderId: payment.orderId.toString(),
                    paymentId: payment._id.toString(),
                }),
            );
            this.logger.log(`Event '${eventType}' for transaction ${orderId} published to Redis stream.`);
        } catch (redisError) {
            this.logger.error(`Failed to publish event to Redis for transaction ${orderId}`, redisError);
        }

        return { RspCode: '00', Message: 'Confirm Success' };
    }

    async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
        return this.paymentModel.findOne({ orderId: new Types.ObjectId(orderId) }).exec();
    }
}
