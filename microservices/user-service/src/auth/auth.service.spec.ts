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

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(), // Add hash to mock bcrypt
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

  describe('validateGoogleUser', () => {
    const googleId = 'google123';
    const email = 'google@example.com';
    const firstName = 'Google';
    const lastName = 'User';
    const picture = 'http://example.com/pic.jpg';
    const accessTokenGG = 'mockGoogleAccessToken';

    it('should create a new user if not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedTempPassword');
      const newUser = {
        _id: 'newUserId',
        email,
        name: `${firstName} ${lastName}`,
        role: 'customer',
        googleId,
        photoUrl: picture,
        toObject: jest.fn().mockReturnValue({
          _id: 'newUserId',
          email,
          name: `${firstName} ${lastName}`,
          role: 'customer',
          googleId,
          photoUrl: picture,
        }),
      } as unknown as UserDocument;
      mockUsersService.createUser.mockResolvedValue(newUser);
      mockJwtService.sign.mockReturnValue(accessTokenGG);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.validateGoogleUser(
        googleId,
        email,
        firstName,
        lastName,
        picture,
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(mockUsersService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email,
          name: `${firstName} ${lastName}`,
          googleId,
          photoUrl: picture,
        }),
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'newUserId',
          email,
          role: 'customer',
        }),
      );
      expect(mockRedisService.set).toHaveBeenCalled();
      expect(result).toEqual({ user: newUser, accessTokenGG });
    });

    it('should update existing user if found and googleId/photoUrl differ', async () => {
      const existingUser = {
        _id: 'existingUserId',
        email,
        name: 'Existing User',
        role: 'customer',
        googleId: 'oldGoogleId',
        photoUrl: 'oldPhotoUrl',
        isModified: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          _id: 'existingUserId',
          email,
          name: 'Existing User',
          role: 'customer',
          googleId,
          photoUrl: picture,
        }),
      } as unknown as UserDocument;
      mockUsersService.findByEmail.mockResolvedValue(existingUser);
      mockJwtService.sign.mockReturnValue(accessTokenGG);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.validateGoogleUser(
        googleId,
        email,
        firstName,
        lastName,
        picture,
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
      expect(existingUser.googleId).toBe(googleId);
      expect(existingUser.photoUrl).toBe(picture);
      expect(existingUser.isModified).toHaveBeenCalled();
      expect(existingUser.save).toHaveBeenCalled();
      expect(mockUsersService.createUser).not.toHaveBeenCalled(); // Should not create new user
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'existingUserId',
          email,
          role: 'customer',
        }),
      );
      expect(mockRedisService.set).toHaveBeenCalled();
      expect(result).toEqual({ user: existingUser, accessTokenGG });
    });

    it('should not update existing user if found and googleId/photoUrl are same', async () => {
      const existingUser = {
        _id: 'existingUserId',
        email,
        name: 'Existing User',
        role: 'customer',
        googleId,
        photoUrl: picture,
        isModified: jest.fn().mockReturnValue(false), // No modification
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          _id: 'existingUserId',
          email,
          name: 'Existing User',
          role: 'customer',
          googleId,
          photoUrl: picture,
        }),
      } as unknown as UserDocument;
      mockUsersService.findByEmail.mockResolvedValue(existingUser);
      mockJwtService.sign.mockReturnValue(accessTokenGG);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.validateGoogleUser(
        googleId,
        email,
        firstName,
        lastName,
        picture,
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
      expect(existingUser.googleId).toBe(googleId);
      expect(existingUser.photoUrl).toBe(picture);
      expect(existingUser.isModified).toHaveBeenCalled();
      expect(existingUser.save).not.toHaveBeenCalled(); // Should not save
      expect(mockUsersService.createUser).not.toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'existingUserId',
          email,
          role: 'customer',
        }),
      );
      expect(mockRedisService.set).toHaveBeenCalled();
      expect(result).toEqual({ user: existingUser, accessTokenGG });
    });
  });
});
