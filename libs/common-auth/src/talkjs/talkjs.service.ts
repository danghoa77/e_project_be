import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';

interface TalkjsUserAttributes {
  _id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'admin';
  photoUrl?: string;
  addresses?: Array<{
    street: string;
    city: string;
    isDefault: boolean;
    _id?: string;
  }>;
  custom?: { [key: string]: any };
}

@Injectable()
export class TalkjsService {
  private readonly logger = new Logger(TalkjsService.name);
  private readonly talkjsAppId: string;
  private readonly talkjsSecretKey: string;

  constructor(private readonly configService: ConfigService) {
    const appId = this.configService.get<string>('TALKJS_APPID');
    const secretKey = this.configService.get<string>('TALKJS_APIKEY');

    if (!appId || !secretKey) {
      this.logger.error(
        'TALKJS_APPID or TALKJS_APIKEY is not configured. Please check your .env file.',
      );
      throw new InternalServerErrorException(
        'TalkJS API keys are not configured.',
      );
    }

    this.talkjsAppId = appId;
    this.talkjsSecretKey = secretKey;
  }

  async upsertUser(user: TalkjsUserAttributes): Promise<any> {
    const talkjsUserId = user._id;
    const url = `https://api.talkjs.com/v1/${this.talkjsAppId}/users/${talkjsUserId}`;

    const userData = {
      name: user.name,
      email: [user.email],
      role: user.role,
      photoUrl: user.photoUrl,
      custom: {
        phone: user.phone,
        addresses: user.addresses,
        ...(user.custom || {}),
      },
    };

    try {
      const response = await axios.put(url, userData, {
        headers: {
          Authorization: `Bearer ${this.talkjsSecretKey}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log(`TalkJS user '${talkjsUserId}' upserted successfully.`);
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to upsert TalkJS user '${talkjsUserId}': ${errorMessage}`,
      );
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `TalkJS API Error Response (Upsert User): ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new InternalServerErrorException(
        `Failed to upsert user to TalkJS.`,
      );
    }
  }

  generateTalkjsToken(userId: string, email: string, role: string): string {
    const payload = {
      userId: userId,
      custom: {
        email: email,
        role: role,
      },
    };

    try {
      return jwt.sign(payload, this.talkjsSecretKey, {
        algorithm: 'HS256',
        expiresIn: '1h',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate TalkJS token for user '${userId}': ${errorMessage}`,
      );
      throw new InternalServerErrorException(
        'Failed to generate TalkJS token.',
      );
    }
  }

  async getOrCreateConversation(
    conversationId: string,
    participantIds: string[],
    subject?: string,
  ): Promise<any> {
    const url = `https://api.talkjs.com/v1/${this.talkjsAppId}/conversations/${conversationId}`;
    const conversationData = {
      participants: participantIds,
      subject: subject,
    };

    try {
      const response = await axios.put(url, conversationData, {
        headers: {
          Authorization: `Bearer ${this.talkjsSecretKey}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log(
        `TalkJS conversation '${conversationId}' managed successfully.`,
      );

      const messagesUrl = `${url}/messages`;
      const messagesResponse = await axios.get(messagesUrl, {
        headers: {
          Authorization: `Bearer ${this.talkjsSecretKey}`,
        },
      });

      this.logger.log(
        `Fetched ${messagesResponse.data.data.length} messages from conversation '${conversationId}'.`,
      );

      return {
        conversationId: conversationId,
        conversation: response.data,
        messages: messagesResponse.data,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to manage TalkJS conversation '${conversationId}': ${errorMessage}`,
      );
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `TalkJS API Error Response (Get/Create Conversation): ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new InternalServerErrorException(
        `Failed to manage conversation on TalkJS.`,
      );
    }
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    message: string,
    type: string = 'text',
  ): Promise<any> {
    const url = `https://api.talkjs.com/v1/${this.talkjsAppId}/conversations/${conversationId}/messages`;

    const payload = [
      {
        sender: senderId,
        text: message,
        type: type,
      },
    ];

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${this.talkjsSecretKey}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log(
        `Message sent to TalkJS conversation '${conversationId}' from '${senderId}'.`,
      );
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send message to TalkJS conversation '${conversationId}': ${errorMessage}`,
      );
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `TalkJS API Error Response (Send Message): ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new InternalServerErrorException(
        `Failed to send message via TalkJS: ${errorMessage}`,
      );
    }
  }

  async listUserConversations(userId: string): Promise<any> {
    const url = `https://api.talkjs.com/v1/${this.talkjsAppId}/users/${userId}/conversations`;

    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.talkjsSecretKey}`,
        },
      });
      this.logger.log(`Listed TalkJS conversations for user '${userId}'.`);
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to list TalkJS conversations for user '${userId}': ${errorMessage}`,
      );
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `TalkJS API Error Response (List Conversations): ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new InternalServerErrorException(
        `Failed to list conversations from TalkJS: ${errorMessage}`,
      );
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const url = `https://api.talkjs.com/v1/${this.talkjsAppId}/conversations/${conversationId}`;

    try {
      await axios.delete(url, {
        headers: {
          Authorization: `Bearer ${this.talkjsSecretKey}`,
        },
      });
      this.logger.log(
        `TalkJS conversation '${conversationId}' deleted successfully.`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to delete TalkJS conversation '${conversationId}': ${errorMessage}`,
      );
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `TalkJS API Error Response (Delete Conversation): ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new InternalServerErrorException(
        `Failed to delete conversation from TalkJS: ${errorMessage}`,
      );
    }
  }
}
