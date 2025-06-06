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
import { RolesGuard, JwtAuthGuard, Role } from '@app/common-auth';



@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async createPaymentUrl(@Req() req: any, @Body() createPaymentDto: CreatePaymentDto) {
        const paymentUrl = await this.paymentsService.createVnpayPaymentUrl(req.user.userId, createPaymentDto);
        return { paymentUrl };
    }

    @Get('webhook')
    async handleVnPayReturn(@Query() query: any, @Res() res: Response) {
        const result = await this.paymentsService.handleVnPayWebhook(query);
        res.status(HttpStatus.OK).json(result);
    }

    @Post('webhook')
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