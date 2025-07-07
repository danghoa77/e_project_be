// libs/common-auth/src/index.ts

// Export Guards
export * from './guards/jwt-auth.guard';
export * from './guards/roles.guard';

// Export Module chính
export * from './common-auth.module';

// Export redis module
export * from './redis/redis.module';
export * from './redis/redis.service';
export * from './decorator/roles.decorator';

export * from './strategies/jwt.strategy';

export * from './mailler/mailer.module';
export * from './mailler/mailer.service';

export * from './talkjs/talkjs.module';
export * from './talkjs/talkjs.service';

export * from './strategies/google.strategy';
export * from './auth-providers/google-auth.service';