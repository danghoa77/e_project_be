// order-service/src/orders/orders.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Req,
    UseGuards,
    Param,
    Put, NotFoundException
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
// Giả định JwtAuthGuard và RolesGuard
class JwtAuthGuard { canActivate() { return true; } }
class RolesGuard { canActivate() { return true; } }
const Roles = (roles: string[]) => (target: any, key?: string | symbol) => { };

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async createOrder(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
        return this.ordersService.createOrder(req.user.userId, createOrderDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getOrders(@Req() req: any) {
        if (req.user.role === 'admin') {
            return this.ordersService.findAllOrders(); // Admin có thể xem tất cả
        }
        return this.ordersService.findOrdersByUserId(req.user.userId); // User xem đơn hàng của mình
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async getOrderById(@Req() req: any, @Param('id') id: string) {
        const order = await this.ordersService.findOrderById(id);
        // Đảm bảo người dùng chỉ xem được đơn hàng của chính họ, trừ admin
        if (req.user.role !== 'admin' && order.userId.toHexString() !== req.user.userId) {
            throw new NotFoundException('The order does not exist or you do not have access.');
        }
        return order;
    }

    @Put(':id/status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(['admin']) // Chỉ admin mới có thể cập nhật trạng thái
    async updateOrderStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateOrderStatusDto) {
        const allowedStatuses = ['confirmed', 'shipped', 'delivered', 'cancelled'] as const;
        if (!allowedStatuses.includes(updateStatusDto.status as any)) {
            throw new NotFoundException('Invalid status to update.');
        }
        return this.ordersService.updateOrderStatus(id, updateStatusDto.status as 'confirmed' | 'shipped' | 'delivered' | 'cancelled');
    }
}