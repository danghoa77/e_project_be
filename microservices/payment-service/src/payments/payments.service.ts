import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment } from '../schemas/payment.schema';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { RedisService } from '@app/common-auth';
import axios from 'axios';
import * as crypto from 'crypto';


@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);
    constructor(
        @InjectModel(Payment.name) private paymentModel: Model<Payment>,
        private configService: ConfigService,
    ) { }

    async createMomoPayment(orderId: string, amount: number) {
        const partnerCode = this.configService.get<string>('MOMO_PARTNER_CODE');
        const accessKey = this.configService.get<string>('MOMO_ACCESS_KEY');
        const secretKey = this.configService.get<string>('MOMO_SECRET_KEY');
        const endpoint = this.configService.get<string>('MOMO_API_ENDPOINT');
        const redirectUrl = this.configService.get<string>('MOMO_REDIRECT_URL');
        const ipnUrl = this.configService.get<string>('MOMO_IPN_URL');

        if (!partnerCode || !accessKey || !secretKey || !endpoint || !redirectUrl || !ipnUrl) {
            throw new InternalServerErrorException('Missing MoMo environment configuration');
        }

        const requestId = `${partnerCode}${Date.now()}`;
        const orderInfo = `Thanh toan don hang ${orderId}`;
        const requestType = 'captureWallet';
        const extraData = ''; 

        const rawSignature =
            `accessKey=${accessKey}` +
            `&amount=${amount}` +
            `&extraData=${extraData}` +
            `&ipnUrl=${ipnUrl}` +
            `&orderId=${orderId}` +
            `&orderInfo=${orderInfo}` +
            `&partnerCode=${partnerCode}` +
            `&redirectUrl=${redirectUrl}` +
            `&requestId=${requestId}` +
            `&requestType=${requestType}`;

        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');

        const requestBody = {
            partnerCode,
            accessKey,
            requestId,
            amount: String(amount),
            orderId,
            orderInfo,
            redirectUrl,
            ipnUrl,
            extraData,
            requestType,
            signature,
            lang: 'vi',
            payType: 'bank',
            bankCode: 'NCB',
        };

        try {
            const response = await axios.post(endpoint, requestBody, {
                headers: { 'Content-Type': 'application/json' },
            });

            this.logger.log(`Momo response: ${JSON.stringify(response.data)}`);

            await this.paymentModel.create({
                orderId,
                amount,
                status: 'PENDING',
                provider: 'MOMO',
                createdAt: new Date(),
            });
            const url = response.data.payUrl;
            return url
        } catch (error) {
            const errData = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            this.logger.error(`Momo payment creation failed: ${errData}`, error.stack);
            throw new InternalServerErrorException('Create Momo payment failed');
        }

    }


    async handleMomoIPN(ipnData: any) {
        this.logger.log(`Received Momo IPN: ${JSON.stringify(ipnData)}`);

        const { orderId, resultCode, message } = ipnData;

        if (resultCode === 0) {
            await this.paymentModel.updateOne(
                { orderId },
                { status: 'SUCCESS', message },
            );
        } else {
            await this.paymentModel.updateOne(
                { orderId },
                { status: 'FAILED', message },
            );
        }

        return { message: 'IPN received' };
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