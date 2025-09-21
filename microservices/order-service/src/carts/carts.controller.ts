import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { JwtAuthGuard } from '@app/common-auth';
import { Request } from 'express';


@Controller('carts')
@UseGuards(JwtAuthGuard)
export class CartsController {
  constructor(private readonly cartsService: CartsService) { }

  @Get()
  async getCart(@Req() req: any) {
    return this.cartsService.getCartByUserId(req.user.userId);
  }

  @Post()
  async addItem(
    @Req() req: any,
    @Body() addItemDto: AddToCartDto,
  ) {
    return this.cartsService.addItemToCart(req.user.userId, addItemDto);
  }

  @Delete(':productId/:variantId/:sizeId')
  async removeItem(
    @Req() req: any,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Param('sizeId') sizeId: string,
  ) {
    return this.cartsService.removeItemFromCart(
      req.user.userId,
      productId,
      variantId,
      sizeId,
    );
  }

  @Put(':productId/:variantId/:sizeId')
  async updateQuantity(
    @Req() req: any,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Param('sizeId') sizeId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.cartsService.updateItemQuantity(
      req.user.userId,
      productId,
      variantId,
      sizeId,
      quantity,
    );
  }

  @Delete()
  async clearCart(@Req() req: any) {
    return await this.cartsService.clearCart(req.user.userId);
  }
}
