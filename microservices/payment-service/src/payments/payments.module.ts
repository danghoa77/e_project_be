// payment-service/src/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from '../schemas/payment.schema';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { RedisModule } from '@app/common-auth';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
        ConfigModule,
        HttpModule, // Để gọi Order Service lấy thông tin đơn hàng
        RedisModule, // Để publish sự kiện
    ],
    controllers: [PaymentsController],
    providers: [PaymentsService],
})
export class PaymentsModule { }