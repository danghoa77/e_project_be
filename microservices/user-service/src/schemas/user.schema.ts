import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;
// Address sẽ là một sub-document (schema con)
@Schema({ _id: false })
export class Address {
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

    @Prop({ required: true, select: false })
    password: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    phone: string;

    @Prop({ enum: ['customer', 'admin'], default: 'customer' })
    role: 'customer' | 'admin';


    @Prop({
        type: [AddressSchema],
        default: [],
        validate: [
            (val: Address[]) => val.length <= 5,
            'User can have a maximum of 5 addresses.'
        ]
    })
    addresses: Address[];
}

export const UserSchema = SchemaFactory.createForClass(User);