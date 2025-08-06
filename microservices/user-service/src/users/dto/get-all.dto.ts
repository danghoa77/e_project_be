// user-service/src/users/dto/get-user.dto.ts
import { Exclude, Expose } from 'class-transformer';

export class GetAllDto {
    @Expose()
    _id: string;

    @Expose()
    email: string;

    @Expose()
    name: string;

    @Expose()
    phone: string;

    @Expose()
    role: string;

}
