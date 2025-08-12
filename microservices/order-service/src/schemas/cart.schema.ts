// order-service/src/orders/schemas/cart.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class CartItem {
  @Prop({ type: Types.ObjectId, required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  variantId: string;

  @Prop({ type: String, required: true })
  imageUrl: string;

  @Prop({ type: String, required: true })
  size: string;

  @Prop({ type: String, required: true })
  color: string;

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
