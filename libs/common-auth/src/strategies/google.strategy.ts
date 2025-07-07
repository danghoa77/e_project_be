// libs/common-auth/src/strategies/google.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    try {
      this.logger.log(`Google OAuth callback for user: ${profile?.id}`);

      if (!profile) {
        this.logger.error('Profile is undefined in Google OAuth callback');
        return done(new Error('Profile not received from Google'), false);
      }

      const { name, emails, photos } = profile;
      const user = {
        email: emails?.[0]?.value || '',
        firstName: name?.givenName || '',
        lastName: name?.familyName || '',
        picture: photos?.[0]?.value || '',
        accessToken,
        refreshToken,
        googleId: profile.id,
      };

      this.logger.log(`Google OAuth user data prepared for: ${user.email}`);
      done(null, user);
    } catch (error) {
      this.logger.error('Error in Google OAuth validation:', error);
      done(error, false);
    }
  }
}
