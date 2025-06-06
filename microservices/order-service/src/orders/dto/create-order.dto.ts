// order-service/src/orders/dto/create-order.dto.ts
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AddToCartDto } from '../../carts/dto/add-to-cart.dto'; // Reuse cart items structure

class ShippingAddressDto {
    @IsNotEmpty({ message: 'Street address must not be empty.' })
    @IsString({ message: 'Street address must be a string.' })
    street: string;

    @IsNotEmpty({ message: 'City must not be empty.' })
    @IsString({ message: 'City must be a string.' })
    city: string;
}

export class CreateOrderDto {

    @ValidateNested({ each: true })
    @Type(() => AddToCartDto)
    items: AddToCartDto[];

    @IsNotEmpty({ message: 'Shipping address must not be empty.' })
    @ValidateNested()
    @Type(() => ShippingAddressDto)
    shippingAddress: ShippingAddressDto;
}
