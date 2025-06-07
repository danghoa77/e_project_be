import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateStockItemDto } from './update-stock-item.dto';

export class BulkUpdateStockDto {
    @IsArray()
    @ValidateNested({ each: true }) // Rất quan trọng: Kiểm tra từng item trong mảng
    @Type(() => UpdateStockItemDto) // Rất quan trọng: Chuyển đổi object thường thành class DTO
    items: UpdateStockItemDto[];
}