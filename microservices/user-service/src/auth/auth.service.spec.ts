// microservices/user-service/src/auth/auth.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService, TalkjsService } from '@app/common-auth';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserDocument } from '../schemas/user.schema';
import { MailerService } from '@app/common-auth';

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
const mockMailerService = {
    sendMail: jest.fn(),
};
const mockTalkJsService = {
    sendMail: jest.fn(),
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
                { provide: MailerService, useValue: mockMailerService },
                { provide: TalkjsService, useValue: mockTalkJsService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateUser', () => {
        it('should return the full user document if validation is successful', async () => {
            const mockUserDocument = {
                email: 'test@test.com',
                password: 'hashedpassword',
                name: 'Test User',
                role: 'customer',
                toObject: () => mockUserDocument,
            };

            mockUsersService.findByEmail.mockResolvedValue(mockUserDocument);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.validateUser('test@test.com', 'password');

            expect(result).toEqual(mockUserDocument);
            expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@test.com');
        });

        it('should return null if user is not found', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);

            const result = await service.validateUser('wrong@test.com', 'password');
            expect(result).toBeNull();
        });

        it('should return null if password does not match', async () => {
            const mockUser = { email: 'test@test.com', password: 'hashedpassword' };
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            const result = await service.validateUser('test@test.com', 'wrongpassword');
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