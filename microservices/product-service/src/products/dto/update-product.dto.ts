// product-service/src/products/dto/update-product.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types'; // Cần cài đặt @nestjs/mapped-types
import { CreateProductDto, CreateVariantDto } from './create-product.dto';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateVariantDto extends PartialType(CreateVariantDto) { }
const ProductFieldsToUpdateDto = OmitType(CreateProductDto, ['variants'] as const);

export class UpdateProductDto extends PartialType(ProductFieldsToUpdateDto) {
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateVariantDto)
    variants?: UpdateVariantDto[];
}