import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class RatingDto {

    @IsString()
    productId: string;

    @IsString()
    userId: string;

    @IsNumber()
    @Min(1)
    @Max(5)
    rating: number;

    @IsOptional()
    @IsString()
    comment?: string;
}
