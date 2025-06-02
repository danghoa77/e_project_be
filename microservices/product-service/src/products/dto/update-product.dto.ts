// product-service/src/products/dto/update-product.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types'; // Cần cài đặt @nestjs/mapped-types
import { CreateProductDto, CreateVariantDto } from './create-product.dto';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateVariantDto extends PartialType(CreateVariantDto) {}

// Tạo một DTO trung gian bao gồm tất cả các trường từ CreateProductDto *ngoại trừ* 'variants'.
// Điều này tránh xung đột kiểu dữ liệu khi UpdateProductDto định nghĩa thuộc tính 'variants' của riêng nó.
// 'as const' là một cách tốt để sử dụng mảng chuỗi cố định làm đối số kiểu.
const ProductFieldsToUpdateDto = OmitType(CreateProductDto, ['variants'] as const);

export class UpdateProductDto extends PartialType(ProductFieldsToUpdateDto) {
    // định nghĩa rõ ràng thuộc tính 'variants' với kiểu UpdateVariantDto mong muốn.
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateVariantDto)
    variants?: UpdateVariantDto[];

    // Có thể thêm logic để xử lý hình ảnh nếu muốn cập nhật riêng
}