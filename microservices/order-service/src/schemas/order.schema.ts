// order-service/src/orders/schemas/order.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Snapshot của sản phẩm tại thời điểm đặt hàng
@Schema({ _id: false })
export class OrderItem {
    @Prop({ type: Types.ObjectId, required: true })
    productId: Types.ObjectId;

    @Prop({ type: String, required: true }) 
    variantId: string;

    @Prop({ type: String, required: true })
    name: string; 

    @Prop({ type: String, required: true })
    size: string;

    @Prop({ type: String, required: true })
    color: string;

    @Prop({ type: Number, required: true, min: 0 })
    price: number; 

    @Prop({ type: Number, required: true, min: 1 })
    quantity: number;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// Địa chỉ giao hàng (snapshot từ User Service)
@Schema({ _id: false })
export class ShippingAddress {
    @Prop({ type: String, required: true })
    street: string;

    @Prop({ type: String, required: true })
    city: string;
}

const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

@Schema({
    timestamps: true,
    collection: 'orders',
})
export class Order extends Document {
    @Prop({ type: Types.ObjectId, required: true })
    userId: Types.ObjectId;

    @Prop({ type: [OrderItemSchema], required: true })
    items: OrderItem[];

    @Prop({ type: Number, required: true, min: 0 })
    totalPrice: number;

    @Prop({
        type: String,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
        index: true,
    })
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

    @Prop({ type: ShippingAddressSchema, required: true })
    shippingAddress: ShippingAddress;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// OrderSchema.index({ userId: 1 });
// OrderSchema.index({ status: 1 });