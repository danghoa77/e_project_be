// user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class Address {
  @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
  _id: string;

  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  city: string;

  @Prop({ default: false })
  isDefault: boolean;
}

const AddressSchema = SchemaFactory.createForClass(Address);

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  _id: string;

  @Prop({ required: true, unique: true, trim: true })
  email: string;

  @Prop()
  password: string;

  @Prop()
  name: string;

  @Prop()
  phone: string;

  @Prop({ enum: ['customer', 'admin'], default: 'customer' })
  role: 'customer' | 'admin';

  @Prop({ type: String, unique: true, sparse: true })
  googleId?: string;

  @Prop({ type: String })
  photoUrl?: string;

  @Prop({
    type: [AddressSchema],
    default: [],
    validate: [
      (val: Address[]) => val.length <= 5,
      'User can have a maximum of 5 addresses.',
    ],
  })
  addresses: Address[];
}

export const UserSchema = SchemaFactory.createForClass(User);
// UserSchema.index({ email: 1 });
// UserSchema.index({ googleId: 1 }, { unique: true, sparse: true });
