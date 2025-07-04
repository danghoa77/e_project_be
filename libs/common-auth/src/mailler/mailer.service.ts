import { Injectable, Inject, Logger } from '@nestjs/common';
import { Transporter, SentMessageInfo } from 'nodemailer';
import { MAILER_TRANSPORTER } from './constants';
import { ConfigService } from '@nestjs/config';

export interface SendMailOptions {
    to: string;
    subject: string;
    html: string;
    from?: string;
    fromName?: string;
}

@Injectable()
export class MailerService {
    private readonly logger = new Logger(MailerService.name);

    constructor(
        @Inject(MAILER_TRANSPORTER) private readonly transporter: Transporter,
        private readonly configService: ConfigService,
    ) { }

    async sendMail(options: SendMailOptions): Promise<void> {
        const { to, subject, html, from, fromName } = options;

        const defaultFrom = this.configService.get<string>('MAIL_FROM');
        const defaultFromName = 'E-commerce Site';

        const fromAddress = from || defaultFrom;
        const fromDisplayName = fromName || defaultFromName;

        if (!fromAddress) {
            this.logger.error(
                'No "from" address is configured. Set MAIL_FROM in .env or pass it in options.',
            );
            return;
        }

        try {
            const result = await this.transporter.sendMail({
                from: `"${fromDisplayName}" <${fromAddress}>`,
                to,
                subject,
                html,
            });

            if (result && typeof result === 'object' && 'messageId' in result && typeof result.messageId === 'string') {
                const info = result as SentMessageInfo;
                this.logger.log(`Mail sent successfully to ${to}. Message ID: ${info.messageId}`);
            } else {
                this.logger.log(`Mail sent successfully to ${to}.`);
            }
        } catch (error: unknown) {
            const stack =
                typeof error === 'object' && error != null && 'stack' in error
                    ? (error as { stack?: string }).stack
                    : undefined;
            this.logger.error(`Failed to send mail to ${to}`, stack);
            throw error;
        }
    }
}
