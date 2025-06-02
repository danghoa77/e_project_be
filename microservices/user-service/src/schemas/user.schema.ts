// user-service/src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Định nghĩa Address Sub-document
@Schema({ _id: false })
export class Address {
    @Prop({ type: String, required: true })
    street: string;

    @Prop({ type: String, required: true })
    city: string;

    @Prop({ type: Boolean, default: false })
    isDefault: boolean;
}

const AddressSchema = SchemaFactory.createForClass(Address);

// Định nghĩa User Schema
@Schema({
    timestamps: true,
    collection: 'users',
})
export class User extends Document {
    @Prop({ type: String, required: true, unique: true })
    email: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: String, required: true })
    phone: string;

    @Prop({ type: String, enum: ['customer', 'admin'], default: 'customer' })
    role: 'customer' | 'admin';

    @Prop({ type: [AddressSchema], default: [], limit: 5 })
    addresses: Address[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Thêm index cho email (đã định nghĩa unique trong @Prop nhưng thêm lại cho rõ)
// UserSchema.index({ email: 1 });