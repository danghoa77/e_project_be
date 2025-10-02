import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Param,
  Put,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '@app/common-auth';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  async createOrder(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.userId, createOrderDto);
  }

  @Get()
  async getOrders(@Req() req: any) {
    if (req.user.role === 'admin') {
      return this.ordersService.findAllOrders();
    }
    return this.ordersService.findOrdersByUserId(req.user.userId);
  }

  @Get('top-categories')
  async getTopCategories() {
    return this.ordersService.getTopCategories();
  }


  @Get('dashboard')
  async getDashboardStats() {
    return this.ordersService.getDashboardStats();
  }

  @Get(':id')
  async getOrderById(@Req() req: any, @Param('id') id: string) {
    const order = await this.ordersService.findOrderById(id);
    if (
      req.user.role !== 'admin' &&
      order.userId.toString() !== req.user.userId
    ) {
      throw new NotFoundException(
        'The order does not exist or you do not have access.',
      );
    }
    return order;
  }

  @Put(':id/cancel')
  async cancelOrder(@Param('id') id: string) {
    return this.ordersService.cancelOrder(id);
  }

  @Put(':id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    const allowedStatuses = [
      'confirmed',
      'shipped',
      'delivered',
      'cancelled',
    ] as const;

    if (!allowedStatuses.includes(updateStatusDto.status as any)) {
      throw new NotFoundException('Invalid status to update.');
    }

    return this.ordersService.updateOrderStatus(
      id,
      updateStatusDto.status,
    );
  }

  @Post(':orderId/:paymentMethod')
  async changePaymentMethod(
    @Param('orderId') orderId: string,
    @Param('paymentMethod') paymentMethod: 'CASH' | 'VNPAY' | 'MOMO',
  ) {
    try {
      return await this.ordersService.changePaymentMethod(
        orderId,
        paymentMethod,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
