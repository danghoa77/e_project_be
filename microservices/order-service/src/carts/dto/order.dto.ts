// order-service/src/orders/dto/order.dto.ts
import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class OrderDto {
    @IsNotEmpty()
    @IsString()
    productId: string;

    @IsNotEmpty()
    @IsString()
    variantId: string;

    @IsNotEmpty()
    @IsString()
    sizeId: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    size: string;

    @IsNotEmpty()
    @IsString()
    color: string;

    @IsNumber()
    @Min(1)
    quantity: number;

    @IsNumber()
    @Min(0)
    price: number;
}
