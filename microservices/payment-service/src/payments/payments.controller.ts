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
    Logger
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Response } from 'express';
import { JwtAuthGuard } from '@app/common-auth';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    private readonly logger = new Logger(PaymentsController.name);
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('create-vnpay-payment')
    createVnpayPayment(
        @Req() req: Request,
        @Res() res: Response,
        @Body() body: { amount: number; bankCode?: string; language?: string }
    ) {
        const ipAddr = req.headers['x-forwarded-for'] || (req as any).socket.remoteAddress;
        const { amount, bankCode, language } = body;

        const paymentUrl = this.paymentsService.createVnpayPaymentUrl(
            ipAddr as string,
            amount,
            bankCode || '',
            language || 'vn',
            'Thanh toan don hang'
        );

        res.redirect(paymentUrl);
    }

    @Get('vnpay-return')
    vnpayReturn(@Query() vnpayParams: any, @Res() res: Response) {
        const isValid = this.paymentsService.verifyVnpaySignature(vnpayParams);

        if (isValid) {
            this.logger.log(`VNPAY Return: Transaction successful. Code: ${vnpayParams['vnp_ResponseCode']}`);
            res.status(200).json({ message: 'Success', code: vnpayParams['vnp_ResponseCode'] });
        } else {
            this.logger.warn(`VNPAY Return: Checksum failed. Code: 97`);
            res.status(200).json({ message: 'Checksum failed', code: '97' });
        }
    }

    @Get('vnpay-ipn')
    vnpayIpn(@Query() vnpayParams: any, @Res() res: Response) {
        const isValid = this.paymentsService.verifyVnpaySignature(vnpayParams);

        if (isValid) {
            const orderId = vnpayParams['vnp_TxnRef'];
            const amount = vnpayParams['vnp_Amount'];
            const rspCode = vnpayParams['vnp_ResponseCode'];

            const checkOrderId = true;
            const checkAmount = true;
            const paymentStatus = '0';

            if (checkOrderId) {
                if (checkAmount) {
                    if (paymentStatus === '0') {
                        if (rspCode === '00') {
                            this.logger.log(`VNPAY IPN: Transaction ${orderId} is successful.`);
                        } else {
                            this.logger.warn(`VNPAY IPN: Transaction ${orderId} failed.`);
                        }
                        res.status(200).json({ RspCode: '00', Message: 'Success' });
                    } else {
                        res.status(200).json({ RspCode: '02', Message: 'This order has been updated to the payment status' });
                    }
                } else {
                    res.status(200).json({ RspCode: '04', Message: 'Amount invalid' });
                }
            } else {
                res.status(200).json({ RspCode: '01', Message: 'Order not found' });
            }
        } else {
            this.logger.warn('VNPAY IPN: Checksum failed.');
            res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
        }
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
