// order-service/src/orders/schemas/cart.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class CartItem {
  @Prop({ type: Types.ObjectId, required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true }) // Dùng String vì _id của sub-document trong Product Service là String
  variantId: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Number, required: true, min: 0 })
  price: number;
}

const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({
  timestamps: true,
  collection: 'carts',
})
export class Cart extends Document {
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];
}
export type CartDocument = HydratedDocument<Cart>;
export const CartSchema = SchemaFactory.createForClass(Cart);

// CartSchema.index({ userId: 1 });
