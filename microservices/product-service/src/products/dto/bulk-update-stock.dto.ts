// bulk-update-stock.dto.ts
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateStockItemDto } from './update-stock-item.dto';

export class BulkUpdateStockDto {
    @IsArray()
    @ValidateNested({ each: true }) //check each item in array
    @Type(() => UpdateStockItemDto) 
    items: UpdateStockItemDto[];
}