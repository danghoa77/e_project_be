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
    HttpStatus,
    NotFoundException,
    Logger,
    Delete,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Response } from 'express';
import { JwtAuthGuard, Role, RolesGuard } from '@app/common-auth';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    private readonly logger = new Logger(PaymentsController.name);
    constructor(private readonly paymentsService: PaymentsService) { }


    @Post('momo/create')
    async createMomoPayment(
        @Req() req: any,
        @Body() body: { orderId: string; amount: number }) {
        const result = await this.paymentsService.createMomoPayment(body.orderId, body.amount, req.user.userId);
        return result;
    }


    @Post('momo/return')
    async momoIPN(@Body() body: { orderId: string; resultCode: string }) {
        const { orderId, resultCode } = body;
        this.logger.log('Momo IPN called', { orderId, resultCode });
        return this.paymentsService.handleMomoURL(body.resultCode, body.orderId);
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

    @Delete('all')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role('admin')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteAllPayments(): Promise<void> {
        await this.paymentsService.deleteAllPayments();
    }
}