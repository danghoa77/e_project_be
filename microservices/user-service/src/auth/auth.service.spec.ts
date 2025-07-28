import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService, TalkjsService, MailerService } from '@app/common-auth';
import * as bcrypt from 'bcryptjs';
import { UserDocument } from '../schemas/user.schema';
import { GooglePassportUser } from '../auth/dto/auth.types';
import { OAuth2Client } from 'google-auth-library';

const mockUsersService = {
  findByEmail: jest.fn(),
  createUser: jest.fn(),
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
  upsertUser: jest.fn(),
};

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const mockGoogleClient = {
  verifyIdToken: jest.fn(),
};
jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => mockGoogleClient),
  };
});

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
    it('should return the user object if validation is successful', async () => {
      const mockUserDoc = {
        password: 'hashedpassword',
        toObject: () => ({ email: 'test@test.com', name: 'Test User' }),
      } as UserDocument;
      mockUsersService.findByEmail.mockResolvedValue(mockUserDoc);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password');
      expect(result).toEqual({ email: 'test@test.com', name: 'Test User' });
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedpassword');
    });

    it('should return null if password does not match', async () => {
      const mockUserDoc = { password: 'hashedpassword' } as UserDocument;
      mockUsersService.findByEmail.mockResolvedValue(mockUserDoc);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@test.com', 'wrongpassword');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return an access token and handle session', async () => {
      const mockUser = { _id: 'someid', email: 'test@test.com', role: 'customer' } as UserDocument;
      mockConfigService.get.mockReturnValue(3600);
      mockJwtService.sign.mockReturnValue('mockAccessToken');
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.login(mockUser);

      expect(result).toEqual({ access_token: 'mockAccessToken' });
      expect(mockJwtService.sign).toHaveBeenCalledWith({ email: 'test@test.com', sub: 'someid', role: 'customer' });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `session:someid`,
        JSON.stringify({ userId: 'someid', email: 'test@test.com', role: 'customer' }),
        3600,
      );
    });
  });

  describe('validateGooglePassportUser', () => {
    const mockGoogleUser: GooglePassportUser = {
      googleId: 'google123',
      email: 'google@example.com',
      firstName: 'Google',
      lastName: 'User',
      picture: 'http://example.com/pic.jpg',
      accessToken: 'google-access-token',
    };

    it('should create a new user and return an access token', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      const newUser = { _id: 'newUserId', email: mockGoogleUser.email, role: 'customer' } as UserDocument;
      mockUsersService.createUser.mockResolvedValue(newUser);
      mockJwtService.sign.mockReturnValue('newMockAccessToken');

      const result = await service.validateGooglePassportUser(mockGoogleUser);

      expect(mockUsersService.createUser).toHaveBeenCalled();
      expect(result).toEqual({ accessToken: 'newMockAccessToken' });
    });

    it('should use an existing user and return an access token', async () => {
      const existingUser = {
        _id: 'existingUserId',
        email: mockGoogleUser.email,
        role: 'customer',
        save: jest.fn(),
      } as unknown as UserDocument;
      mockUsersService.findByEmail.mockResolvedValue(existingUser);
      mockJwtService.sign.mockReturnValue('existingMockAccessToken');

      const result = await service.validateGooglePassportUser(mockGoogleUser);

      expect(mockUsersService.createUser).not.toHaveBeenCalled();
      expect(result).toEqual({ accessToken: 'existingMockAccessToken' });
    });
  });

  describe('loginWithGoogleToken', () => {
    const idToken = 'mockIdToken';
    const googlePayload = {
      sub: 'google123',
      email: 'google@example.com',
      given_name: 'Google',
      family_name: 'User',
      picture: 'http://example.com/pic.jpg',
    };

    it('should successfully validate token, find user, and return access token', async () => {
      mockGoogleClient.verifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });
      const existingUser = {
        _id: 'existingUserId',
        email: googlePayload.email,
        role: 'customer',
        save: jest.fn(),
      } as unknown as UserDocument;
      mockUsersService.findByEmail.mockResolvedValue(existingUser);
      mockJwtService.sign.mockReturnValue('finalAccessToken');

      const result = await service.loginWithGoogleToken(idToken);

      expect(mockGoogleClient.verifyIdToken).toHaveBeenCalledWith({ idToken, audience: undefined });
      expect(result).toEqual({ accessToken: 'finalAccessToken' });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockGoogleClient.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.loginWithGoogleToken(idToken)).rejects.toThrow('Failed to validate Google token.');
    });
  });
});
