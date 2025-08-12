// order-service/src/orders/dto/create-order.dto.ts
import { IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderDto } from '../../carts/dto/order.dto';


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
  @Type(() => OrderDto)
  items: OrderDto[];

  @IsNotEmpty({ message: 'Shipping address must not be empty.' })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @IsNotEmpty({ message: 'Total price must not be empty.' })
  @Type(() => Number)
  totalPrice: number
}
