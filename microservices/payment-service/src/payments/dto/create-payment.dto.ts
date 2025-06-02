// payment-service/src/payments/dto/create-payment.dto.ts
import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class CreatePaymentDto {
    @IsNotEmpty({ message: 'Order ID is not empty' })
    @IsString({ message: 'Order ID must be string.' })
    orderId: string;

    @IsNumber({}, { message: 'Amount must be a number.' })
    @Min(1, { message: 'Amount must be greater than 0.' })
    amount: number; // Có thể bỏ nếu muốn lấy từ Order Service
}