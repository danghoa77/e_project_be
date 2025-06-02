// product-service/src/products/dto/create-product.dto.ts
import { IsNotEmpty, ArrayNotEmpty, IsString, IsArray, ValidateNested, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
    @IsNotEmpty({ message: 'Size must not be empty.' })
    @IsString({ message: 'Size must be a string.' })
    size: string;

    @IsNotEmpty({ message: 'Color must not be empty.' })
    @IsString({ message: 'Color must be a string.' })
    color: string;

    @IsNumber({}, { message: 'Price must be a number.' })
    @Min(0, { message: 'Price cannot be negative.' })
    price: number;

    @IsOptional()
    @IsNumber({}, { message: 'Sale price must be a number.' })
    @Min(0, { message: 'Sale price cannot be negative.' })
    salePrice?: number;

    @IsNumber({}, { message: 'Stock quantity must be a number.' })
    @Min(0, { message: 'Stock quantity cannot be negative.' })
    stock: number;
}
class ImageDto {
    @IsString({ message: 'Image URL must be a string.' })
    url: string;

    @IsString({ message: 'Cloudinary ID must be a string.' })
    cloudinaryId: string;
}

export class CreateProductDto {

    @IsNotEmpty({ message: 'Product name must not be empty.' })
    @IsString({ message: 'Product name must be a string.' })
    name: string;

    @IsArray({ message: 'Images must be an array.' })
    @ArrayNotEmpty({ message: 'Images array must not be empty.' })
    @ValidateNested({ each: true })
    @Type(() => ImageDto)
    images: ImageDto[];

    @IsNotEmpty({ message: 'Category must not be empty.' })
    @IsString({ message: 'Category must be a string.' })
    category: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateVariantDto)
    variants: CreateVariantDto[];

}
