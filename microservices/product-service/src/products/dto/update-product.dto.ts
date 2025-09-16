import {
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';


export class UpdateSizeOptionDto {
  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;
}


export class UpdateColorVariantDto {
  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSizeOptionDto)
  sizes?: UpdateSizeOptionDto[];
}


export class UpdateImageDto {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  cloudinaryId?: string;
}


export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateImageDto)
  images?: UpdateImageDto[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;


  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateColorVariantDto)
  variants?: UpdateColorVariantDto[];


  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deletedImages?: string[];


  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deletedVariants?: string[];


  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deletedSizes?: string[];
}
