// bulk-update-stock.dto.ts
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateStockItemDto } from './update-stock-item.dto';

export class BulkUpdateStockDto {
    @IsArray()
    @ValidateNested({ each: true }) // Kiểm tra từng item trong mảng
    @Type(() => UpdateStockItemDto) //  Chuyển đổi object thường thành class DTO
    items: UpdateStockItemDto[];
}