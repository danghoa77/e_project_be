import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';

export class UpdateStockItemDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsString()
    @IsNotEmpty()
    variantId: string;

    @IsInt({ message: 'Quantity must be an integer.' })
    @Min(1, { message: 'Quantity must be at least 1.' })
    quantity: number;
}