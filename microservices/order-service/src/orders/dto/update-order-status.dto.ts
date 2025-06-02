// order-service/src/orders/dto/update-order-status.dto.ts
import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
    @IsNotEmpty({ message: 'Status must not be empty.' })
    @IsString({ message: 'Status must be a string.' })
    @IsIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], {
        message: 'Invalid status value. Allowed values: pending, confirmed, shipped, delivered, cancelled.',
    })
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
}
