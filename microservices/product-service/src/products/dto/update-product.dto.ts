// product-service/src/products/dto/update-product.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProductDto, CreateVariantDto } from './create-product.dto';
import { IsOptional, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateVariantDto extends PartialType(CreateVariantDto) { }

class UpdateImageDto {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  cloudinaryId?: string;
}

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['variants', 'images'] as const),
) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateImageDto)
  images?: UpdateImageDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deletedImages?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateVariantDto)
  variants?: UpdateVariantDto[];
}