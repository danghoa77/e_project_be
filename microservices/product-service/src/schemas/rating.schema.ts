import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
    _id: true,
    timestamps: true,
})
export class Rating extends Document {

    @Prop({ type: String, required: true })
    userId: string;

    @Prop({ type: Number, required: true, min: 0, max: 5 })
    rating: number;

    @Prop({ type: String })
    comment?: string;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);
