// microservices/user-service/src/auth/auth.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@app/common-auth';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserDocument } from '../schemas/user.schema';

// Mock (giả lập) các dependency mà AuthService cần
const mockUsersService = {
    findByEmail: jest.fn(),
};
const mockJwtService = {
    sign: jest.fn(),
};
const mockRedisService = {
    set: jest.fn(),
    del: jest.fn(),
};
const mockConfigService = {
    get: jest.fn(),
};


jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
}));


describe('AuthService', () => {
    let service: AuthService;

    beforeEach(async () => {

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,

                { provide: UsersService, useValue: mockUsersService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: RedisService, useValue: mockRedisService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateUser', () => {
        it('should return user object if validation is successful', async () => {
            const mockUser = {
                email: 'test@test.com',
                password: 'hashedpassword',
                toObject: () => ({ email: 'test@test.com' }),
            };
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.validateUser('test@test.com', 'password');

            expect(result).toEqual({ email: 'test@test.com' });
            expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@test.com');
        });

        it('should return null if user is not found', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);

            const result = await service.validateUser('wrong@test.com', 'password');
            expect(result).toBeNull();
        });

        it('should return null if password does not match', async () => {
            // Arrange: Giả lập password không khớp
            const mockUser = { email: 'test@test.com', password: 'hashedpassword' };
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            // Act
            const result = await service.validateUser('test@test.com', 'wrongpassword');

            // Assert
            expect(result).toBeNull();
        });
    });


    describe('login', () => {
        it('should return an access token', async () => {
            // Arrange
            const mockUser = { _id: 'someid', email: 'test@test.com', role: 'customer' };
            mockConfigService.get.mockReturnValue('1h');
            mockJwtService.sign.mockReturnValue('mockAccessToken');
            mockRedisService.set.mockResolvedValue('OK');

            // Act
            const result = await service.login(mockUser as UserDocument);

            // Assert
            expect(result).toHaveProperty('access_token');
            expect(result.access_token).toBe('mockAccessToken');
            expect(mockJwtService.sign).toHaveBeenCalledWith({
                email: 'test@test.com',
                sub: 'someid',
                role: 'customer'
            });
            expect(mockRedisService.set).toHaveBeenCalled();
        });
    });
});