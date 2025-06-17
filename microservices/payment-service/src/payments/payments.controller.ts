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
    HttpStatus, NotFoundException,
    Logger
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Response } from 'express';
import { JwtAuthGuard } from '@app/common-auth';



@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    private readonly logger = new Logger(PaymentsController.name);
    constructor(private readonly paymentsService: PaymentsService) { }

    @Get('return')//Xử lý returnUrl test từ VNPAY
    handleVnpayReturnForTesting(@Query() query: any) {
        this.logger.log('VNPAY has returned to the returnUrl with query:', query);
        return {
            message: 'SUCCESS - VNPAY has successfully called back the returnUrl. This is the data received:',
            data: query,
        };
    }

    @Post()// Tạo URL thanh toán VNPAY
    @UseGuards(JwtAuthGuard)
    async createPaymentUrl(@Req() req: any, @Body() createPaymentDto: CreatePaymentDto) {
        const authToken = req.headers.authorization;
        return this.paymentsService.createVnpayPaymentUrl(
            req.user.userId,
            createPaymentDto,
            authToken,

        );
    }

    @Get('webhook')//Xử lý callback từ VNPAY (GET)
    async handleVnPayReturn(@Query() query: any, @Res() res: Response) {
        const result = await this.paymentsService.handleVnpayWebhook(query);
        res.status(HttpStatus.OK).json(result);
    }

    @Post('webhook')//Xử lý callback từ VNPAY (POST)
    @HttpCode(HttpStatus.OK)
    async handleVnPayWebhookPost(@Body() query: any) {
        return this.paymentsService.handleVnpayWebhook(query);
    }

    @Get(':orderId')// Lấy thông tin thanh toán theo orderId
    @UseGuards(JwtAuthGuard)
    async getPaymentStatus(@Req() req: any, @Param('orderId') orderId: string) {
        const payment = await this.paymentsService.getPaymentByOrderId(orderId);
        if (!payment || (req.user.role !== 'admin' && payment.userId.toHexString() !== req.user.userId)) {
            throw new NotFoundException('Payment information does not exist or you do not have access.');
        }
        return payment;
    }
}