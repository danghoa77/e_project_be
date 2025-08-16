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
interface AuthenticatedRequest extends Request {
    user: {
        userId: string;
        role: string;
    };
}
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    private readonly logger = new Logger(PaymentsController.name);
    constructor(private readonly paymentsService: PaymentsService) { }


    @Post('momo/create')
    async createMomoPayment(@Body() body: { orderId: string; amount: number }) {
        const result = await this.paymentsService.createMomoPayment(body.orderId, body.amount);
        return result;
    }


    @Post('momo/ipn')
    async momoIPN(@Body() body: any) {
        this.logger.log('Momo IPN called', body);
        return this.paymentsService.handleMomoIPN(body);
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