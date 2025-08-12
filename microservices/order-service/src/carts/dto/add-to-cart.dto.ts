// order-service/src/carts/dto/add-to-cart.dto.ts
import { IsNotEmpty, IsString, IsNumber, Min, IsArray } from 'class-validator';

export class AddToCartDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  variantId: string;

  @IsNotEmpty()
  @IsString()
  imageUrl: string;

  @IsNotEmpty()
  @IsString()
  size: string;

  @IsNotEmpty()
  @IsString()
  color: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
