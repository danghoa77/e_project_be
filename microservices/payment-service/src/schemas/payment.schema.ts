import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {

    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
    orderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true })
    amount: number;

    @Prop({ enum: ['pending', 'completed', 'failed'], default: 'pending' })
    status: string;


    @Prop({ required: true, unique: true })
    transactionId: string;


    @Prop()
    gatewayTransactionId?: string;

    @Prop()
    bankCode?: string;

    @Prop()
    payDate?: Date;

    @Prop({ type: Object })
    gatewayResponse?: any;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);