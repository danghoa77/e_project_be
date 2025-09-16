import {
  IsNotEmpty,
  ArrayNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class ImageDto {
  @IsNotEmpty({ message: 'Image URL must not be empty.' })
  @IsString({ message: 'Image URL must be a string.' })
  url: string;

  @IsNotEmpty({ message: 'Cloudinary ID must not be empty.' })
  @IsString({ message: 'Cloudinary ID must be a string.' })
  cloudinaryId: string;
}

export class CreateSizeOptionDto {
  @IsNotEmpty({ message: 'Size must not be empty.' })
  @IsString({ message: 'Size must be a string.' })
  size: string;

  @IsNotEmpty({ message: 'Price must not be empty.' })
  @IsNumber({}, { message: 'Price must be a number.' })
  @Min(0, { message: 'Price cannot be negative.' })
  price: number;

  @IsOptional()
  @IsNumber({}, { message: 'Sale price must be a number.' })
  @Min(0, { message: 'Sale price cannot be negative.' })
  salePrice?: number;

  @IsNotEmpty({ message: 'Stock quantity must not be empty.' })
  @IsNumber({}, { message: 'Stock quantity must be a number.' })
  @Min(0, { message: 'Stock quantity cannot be negative.' })
  stock: number;
}

export class CreateColorVariantDto {
  @IsNotEmpty({ message: 'Color must not be empty.' })
  @IsString({ message: 'Color must be a string.' })
  color: string;

  @IsArray({ message: 'Sizes must be an array.' })
  @ArrayNotEmpty({ message: 'Sizes array must not be empty.' })
  @ValidateNested({ each: true })
  @Type(() => CreateSizeOptionDto)
  sizes: CreateSizeOptionDto[];
}

export class CreateProductDto {
  @IsNotEmpty({ message: 'Product name must not be empty.' })
  @IsString({ message: 'Product name must be a string.' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  description?: string;

  @IsNotEmpty({ message: 'Category must not be empty.' })
  @IsString({ message: 'Category must be a string.' })
  category: string;

  @IsArray({ message: 'Images must be an array.' })
  @ArrayNotEmpty({ message: 'Images array must not be empty.' })
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  images: ImageDto[];

  @IsArray({ message: 'Variants must be an array.' })
  @ArrayNotEmpty({ message: 'Variants array must not be empty.' })
  @ValidateNested({ each: true })
  @Type(() => CreateColorVariantDto)
  variants: CreateColorVariantDto[];
}
