// order-service/src/carts/dto/add-to-cart.dto.ts
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';

export class AddToCartDto {
  @IsNotEmpty({ message: 'Product ID must not be empty.' })
  @IsString({ message: 'Product ID must be a string.' })
  productId: string;

  @IsNotEmpty({ message: 'Variant ID must not be empty.' })
  @IsString({ message: 'Variant ID must be a string.' })
  variantId: string; // _id of the specific variant

  @IsNumber({}, { message: 'Quantity must be a number.' })
  @Min(1, { message: 'Quantity must be at least 1.' })
  quantity: number;
}
