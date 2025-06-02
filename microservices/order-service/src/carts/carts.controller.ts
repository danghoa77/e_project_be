// order-service/src/carts/carts.controller.ts
import { Controller, Get, Post, Body, Req, UseGuards, Param, Delete, Put } from '@nestjs/common';
import { CartsService } from './carts.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
// import { Roles } from '@userAuth/decorators/roles.decorator';
// import { JwtAuthGuard } from '@userAuth/guards/jwt-auth.guard';
// import { RolesGuard } from '@userAuth/guards/roles.guard';
// import { JwtAuthGuard } from '../../../user-service/src/auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../../../user-service/src/auth/guards/roles.guard'; // Giả định bạn đã sao chép guards này sang Order Service
// Giả định JwtAuthGuard và RolesGuard từ User Service đã được tái sử dụng
// Hoặc tạo mới trong Order Service nếu bạn muốn giữ độc lập.
// Để đơn giản, tôi sẽ giả định có thể import JwtAuthGuard tương tự như User Service.

// // Tạm thời tạo dummy guards nếu bạn chưa sao chép sang đây
// class JwtAuthGuard { canActivate() { return true; } }
// class RolesGuard { canActivate() { return true; } }
// const Roles = (roles: string[]) => (target: any, key?: string | symbol) => { }; // Dummy decorator


@Controller('carts')
// @UseGuards(JwtAuthGuard) // Bảo vệ tất cả các API giỏ hàng
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