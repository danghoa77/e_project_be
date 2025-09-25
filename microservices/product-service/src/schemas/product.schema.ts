// product.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Rating, RatingSchema } from './rating.schema';
import { Category } from './category.schema';
@Schema({ _id: false })
export class Image {
    @Prop({ type: String, required: true })
    url: string;

    @Prop({ type: String, required: true })
    cloudinaryId: string;
}

const ImageSchema = SchemaFactory.createForClass(Image);

@Schema({ _id: true })
export class SizeOption {
    _id: string;

    @Prop({ type: String, required: true })
    size: string;

    @Prop({ type: Number, required: true, min: 0 })
    price: number;

    @Prop({ type: Number, default: 0, min: 0 })
    salePrice: number;

    @Prop({ type: Number, required: true, min: 0 })
    stock: number;
}

const SizeOptionSchema = SchemaFactory.createForClass(SizeOption);

@Schema({ _id: true })
export class ColorVariant {
    _id: string;

    @Prop({ type: String, required: true, index: true })
    color: string;

    @Prop({ type: [SizeOptionSchema], default: [] })
    sizes: SizeOption[];
}

const ColorVariantSchema = SchemaFactory.createForClass(ColorVariant);

@Schema({
    timestamps: true,
    collection: 'products',
})
export class Product extends Document {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: [ImageSchema], default: [] })
    images: Image[];

    @Prop({ type: String })
    description: string;

    @Prop({ type: Types.ObjectId, ref: Category.name, required: true })
    category: Types.ObjectId;


    @Prop({ type: [ColorVariantSchema], default: [] })
    variants: ColorVariant[];

    @Prop({ type: [RatingSchema], default: [] })
    ratings: Rating[];

    @Prop({ type: Number, default: 0 })
    averageRating: number;

    @Prop({ type: Number, default: 0 })
    numReviews: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({
    category: 1,
    'variants.color': 1,
    'variants.sizes.size': 1,
    'variants.sizes.price': 1,
});

ProductSchema.index({ 'variants.sizes.price': 1 });
ProductSchema.index({ 'variants.sizes.size': 1 });
ProductSchema.index({ 'variants.color': 1 });


