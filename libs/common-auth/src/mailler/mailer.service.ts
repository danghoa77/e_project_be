import { Injectable, Inject, Logger } from '@nestjs/common';
import { Transporter } from 'nodemailer';
import { MAILER_TRANSPORTER } from './constants';
import { ConfigService } from '@nestjs/config';

// Create a type-safe interface for the email result
interface SafeEmailResult {
  messageId?: string;
  envelope?: {
    from: string;
    to: string[];
  };
  accepted?: string[];
  rejected?: string[];
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
}

interface ErrorWithStack extends Error {
  stack?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(
    @Inject(MAILER_TRANSPORTER) private readonly transporter: Transporter,
    private readonly configService: ConfigService,
  ) {}

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
      // Cast the result to our safe interface to avoid 'any' type issues
      const result = (await this.transporter.sendMail({
        from: `"${fromDisplayName}" <${fromAddress}>`,
        to,
        subject,
        html,
      })) as SafeEmailResult;

      // Check if messageId exists and is a string
      if (result.messageId && typeof result.messageId === 'string') {
        this.logger.log(
          `Mail sent successfully to ${to}. Message ID: ${result.messageId}`,
        );
      } else {
        this.logger.log(`Mail sent successfully to ${to}.`);
      }
    } catch (error: unknown) {
      let stack: string | undefined;

      if (
        typeof error === 'object' &&
        error !== null &&
        'stack' in error &&
        typeof (error as ErrorWithStack).stack === 'string'
      ) {
        stack = (error as ErrorWithStack).stack;
      }

      this.logger.error(`Failed to send mail to ${to}`, stack);
      throw error;
    }
  }
}
