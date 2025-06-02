// user-service/src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
// import { User } from '../../schemas/user.schema';

export enum Role {
    Admin = 'admin',
    Customer = 'customer',
}
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);


// export const Roles = (...roles: User['role'][]) => SetMetadata('roles', roles);