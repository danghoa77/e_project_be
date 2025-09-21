// category.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


@Schema({ _id: true })
export class Category extends Document {
    @Prop({ type: String, required: true })
    name: string;
}
export const CategorySchema = SchemaFactory.createForClass(Category);