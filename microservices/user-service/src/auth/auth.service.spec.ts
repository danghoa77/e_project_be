import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService, TalkjsService, MailerService } from '@app/common-auth';
import * as bcrypt from 'bcryptjs';
import { UserDocument } from '../schemas/user.schema';

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

// Mock bcrypt
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
    it('should return the full user object if validation is successful', async () => {
      const mockUserDocument = {
        email: 'test@test.com',
        name: 'Test User',
        role: 'customer',
        password: 'hashedpassword',
        toObject: jest.fn().mockReturnValue({
          email: 'test@test.com',
          name: 'Test User',
          role: 'customer',
        }),
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUserDocument);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result: Partial<UserDocument> | null = await service.validateUser(
        'test@test.com',
        'password',
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        'test@test.com',
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedpassword');
      expect(result).toEqual({
        email: 'test@test.com',
        name: 'Test User',
        role: 'customer',
      });
    });

    it('should return null if user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result: Partial<UserDocument> | null = await service.validateUser(
        'wrong@test.com',
        'password',
      );

      expect(result).toBeNull();
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        'wrong@test.com',
      );
    });

    it('should return null if password does not match', async () => {
      const mockUser = {
        email: 'test@test.com',
        password: 'hashedpassword',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result: Partial<UserDocument> | null = await service.validateUser(
        'test@test.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrongpassword',
        'hashedpassword',
      );
    });
  });

  describe('login', () => {
    it('should return an access token', async () => {
      const mockUser = {
        _id: 'someid',
        email: 'test@test.com',
        role: 'customer',
      } as unknown as UserDocument;

      mockConfigService.get.mockReturnValue('1h');
      mockJwtService.sign.mockReturnValue('mockAccessToken');
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.login(mockUser);

      expect(result).toHaveProperty('access_token', 'mockAccessToken');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: 'test@test.com',
        sub: 'someid',
        role: 'customer',
      });
      expect(mockRedisService.set).toHaveBeenCalled();
    });
  });
});
