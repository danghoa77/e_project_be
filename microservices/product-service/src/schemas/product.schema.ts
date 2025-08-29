// product-service/src/products/schemas/product.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


@Schema({ _id: false })
export class Image {
    @Prop({ type: String, required: true })
    url: string;

    @Prop({ type: String, required: true })
    cloudinaryId: string;
}

const ImageSchema = SchemaFactory.createForClass(Image);


@Schema({ _id: true }) //each field id will be a string
export class Variant {
    _id: Types.ObjectId;

    @Prop({ type: String, required: true })
    size: string;

    @Prop({ type: String, required: true })
    color: string;

    @Prop({ type: Number, required: true, min: 0 })
    price: number;

    @Prop({ type: Number, default: 0, min: 0 })
    salePrice: number;

    @Prop({ type: Number, required: true, min: 0 })
    stock: number;
}

const VariantSchema = SchemaFactory.createForClass(Variant);


@Schema({
    timestamps: true,
    collection: 'products',
})
export class Product extends Document {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: [ImageSchema], default: [] })
    images: Image[];

    @Prop({ type: String, required: false })
    description: string;

    @Prop({ type: String, required: true, })
    category: string; //[]

    @Prop({ type: [VariantSchema], default: [] })
    variants: Variant[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ 'variants.price': 1 });
ProductSchema.index({ 'variants.size': 1 });