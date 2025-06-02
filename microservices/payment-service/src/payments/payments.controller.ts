// payment-service/src/payments/payments.controller.ts
import {
    Controller,
    Post,
    Body,
    Get,
    Req,
    Res,
    Query,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus, NotFoundException
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Response } from 'express'; 


// Giả định JwtAuthGuard
class JwtAuthGuard { canActivate() { return true; } }

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post()
    @UseGuards(JwtAuthGuard) // Chỉ cho phép người dùng đã đăng nhập tạo yêu cầu thanh toán
    async createPaymentUrl(@Req() req: any, @Body() createPaymentDto: CreatePaymentDto) {
        // req.user.userId sẽ được cung cấp bởi JwtAuthGuard
        const paymentUrl = await this.paymentsService.createVnpayPaymentUrl(req.user.userId, createPaymentDto);
        return { paymentUrl };
    }

    // VNPAY Webhook (callback URL)
    @Get('webhook') // VNPAY thường gọi GET cho callback
    async handleVnPayReturn(@Query() query: any, @Res() res: Response) {
        const result = await this.paymentsService.handleVnPayWebhook(query);
        // VNPAY mong đợi response JSON
        res.status(HttpStatus.OK).json(result);
    }

    @Post('webhook') // Cũng có thể nhận POST, tùy cấu hình VNPAY
    @HttpCode(HttpStatus.OK)
    async handleVnPayWebhookPost(@Body() query: any) {
        return this.paymentsService.handleVnPayWebhook(query);
    }

    @Get(':orderId')
    @UseGuards(JwtAuthGuard)
    async getPaymentStatus(@Req() req: any, @Param('orderId') orderId: string) {
        const payment = await this.paymentsService.getPaymentByOrderId(orderId);
        if (!payment || (req.user.role !== 'admin' && payment.userId.toHexString() !== req.user.userId)) {
            throw new NotFoundException('Payment information does not exist or you do not have access.');
        }
        return payment;
    }
  }