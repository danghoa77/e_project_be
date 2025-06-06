// order-service/src/carts/carts.controller.ts
import { Controller, Get, Post, Body, Req, UseGuards, Param, Delete, Put } from '@nestjs/common';
import { CartsService } from './carts.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { RolesGuard, JwtAuthGuard, Role } from '@app/common-auth';



// class JwtAuthGuard { canActivate() { return true; } }
// class RolesGuard { canActivate() { return true; } }
// const Roles = (roles: string[]) => (target: any, key?: string | symbol) => { }; // Dummy decorator


@Controller('carts')
@UseGuards(RolesGuard)
// @Roles(Role.Customer, Role.Admin) 
@UseGuards(JwtAuthGuard)
export class CartsController {
    constructor(private readonly cartsService: CartsService) { }

    @Get()
    async getCart(@Req() req: any) {
        return this.cartsService.getCartByUserId(req.user.userId);
    }

    @Post()
    async addItem(@Req() req: any, @Body() addItemDto: AddToCartDto) {
        return this.cartsService.addItemToCart(req.user.userId, addItemDto);
    }

    @Delete(':productId/:variantId')
    async removeItem(
        @Req() req: any,
        @Param('productId') productId: string,
        @Param('variantId') variantId: string,
    ) {
        return this.cartsService.removeItemFromCart(req.user.userId, productId, variantId);
    }

    @Put(':productId/:variantId')
    async updateQuantity(
        @Req() req: any,
        @Param('productId') productId: string,
        @Param('variantId') variantId: string,
        @Body('quantity') quantity: number,
    ) {
        return this.cartsService.updateItemQuantity(req.user.userId, productId, variantId, quantity);
    }

    @Delete()
    async clearCart(@Req() req: any) {
        await this.cartsService.clearCart(req.user.userId);
        return { message: 'Cart has been cleared.' };
    }
}