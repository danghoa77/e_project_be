// payment-service/src/payments/schemas/payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
    timestamps: true,
    collection: 'payments',
})
export class Payment extends Document {
    @Prop({ type: Types.ObjectId, required: true })
    orderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true })
    userId: Types.ObjectId;

    @Prop({ type: Number, required: true, min: 0 })
    amount: number;

    @Prop({
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
    })
    status: 'pending' | 'completed' | 'failed';

    @Prop({ type: String, unique: true, sparse: true }) // Transaction ID từ VNPAY, có thể null nếu pending
    transactionId: string;

    @Prop({ type: String }) // Mã ngân hàng
    bankCode: string;

    @Prop({ type: Date }) // Ngày thanh toán
    payDate: Date;

    @Prop({ type: Object }) // Lưu trữ phản hồi đầy đủ từ Gateway
    gatewayResponse: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ userId: 1 });
// PaymentSchema.index({ transactionId: 1 });