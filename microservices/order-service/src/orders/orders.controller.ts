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
import { RolesGuard, JwtAuthGuard, Role } from '@app/common-auth';


@UseGuards(RolesGuard, JwtAuthGuard)
@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    // @Role('customer')
    @Post()
    async createOrder(@Req() req: any,
        @Body() createOrderDto: CreateOrderDto) {
        return this.ordersService.createOrder(req.user.userId, createOrderDto);
    }

    @Role('admin')
    @Get()
    async getOrders(@Req() req: any) {
        if (req.user.role === 'admin') {
            return this.ordersService.findAllOrders();
        }
        return this.ordersService.findOrdersByUserId(req.user.userId);
    }


    @Get(':id')
    async getOrderById(@Req() req: any, @Param('id') id: string) {
        const order = await this.ordersService.findOrderById(id);
        if (req.user.role !== 'admin' && order.userId.toHexString() !== req.user.userId) {
            throw new NotFoundException('The order does not exist or you do not have access.');
        }
        return order;
    }

    @Role('admin')
    @Put(':id/status')
    async updateOrderStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateOrderStatusDto) {
        const allowedStatuses = ['confirmed', 'shipped', 'delivered', 'cancelled'] as const;
        if (!allowedStatuses.includes(updateStatusDto.status as any)) {
            throw new NotFoundException('Invalid status to update.');
        }
        return this.ordersService.updateOrderStatus(id, updateStatusDto.status as 'confirmed' | 'shipped' | 'delivered' | 'cancelled');
    }
}