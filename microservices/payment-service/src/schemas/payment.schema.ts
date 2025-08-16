import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;
export enum PaymentStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
}
@Schema({ timestamps: true, collection: 'payments' })
export class Payment {

    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
    orderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: false })
    userId: Types.ObjectId;

    @Prop({ required: true })
    amount: number;

    @Prop({ enum: PaymentStatus, default: PaymentStatus.PENDING })
    status: PaymentStatus;

    @Prop()
    payDate?: Date;

    createdAt: Date;
    updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);