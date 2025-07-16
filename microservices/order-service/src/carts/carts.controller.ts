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

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('carts')
@UseGuards(JwtAuthGuard)
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  async getCart(@Req() req: AuthenticatedRequest) {
    return this.cartsService.getCartByUserId(req.user.userId);
  }

  @Post()
  async addItem(
    @Req() req: AuthenticatedRequest,
    @Body() addItemDto: AddToCartDto,
  ) {
    return this.cartsService.addItemToCart(req.user.userId, addItemDto);
  }

  @Delete(':productId/:variantId')
  async removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.cartsService.removeItemFromCart(
      req.user.userId,
      productId,
      variantId,
    );
  }

  @Put(':productId/:variantId')
  async updateQuantity(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.cartsService.updateItemQuantity(
      req.user.userId,
      productId,
      variantId,
      quantity,
    );
  }

  //check stock of items in cart
  // @Get('validate-stock')
  // async validateCartStock(@Req() req: any) {
  //     return this.cartsService.validateCartStock(req.user.userId);
  // }

  @Delete()
  async clearCart(@Req() req: AuthenticatedRequest) {
    await this.cartsService.clearCart(req.user.userId);
    return { message: 'Cart has been cleared.' };
  }
}
