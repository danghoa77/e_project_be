// mailer.module.ts
import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { MAILER_TRANSPORTER } from './constants';

const mailerProvider = {
    provide: MAILER_TRANSPORTER,
    useFactory: async (configService: ConfigService) => {
        return createTransport({
            host: configService.get('MAIL_HOST'),
            port: configService.get('MAIL_PORT'),
            secure: false,
            auth: {
                user: configService.get('MAIL_USER'),
                pass: configService.get('MAIL_PASS'),
            },
        });
    },
    inject: [ConfigService],
};

@Module({
    imports: [ConfigModule],
    providers: [MailerService, {
        provide: MAILER_TRANSPORTER,
        useFactory: (configService: ConfigService) => {
            return createTransport({
                host: configService.get('MAIL_HOST'),
                port: configService.get('MAIL_PORT'),
                secure: false,
                auth: {
                    user: configService.get('MAIL_USER'),
                    pass: configService.get('MAIL_PASS'),
                },
            });
        },
        inject: [ConfigService],
    }],
    exports: [MailerService, MAILER_TRANSPORTER],
})
export class MailerModule { }