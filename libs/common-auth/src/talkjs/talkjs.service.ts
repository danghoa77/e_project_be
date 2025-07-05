// libs/talkjs-common/src/talkjs.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';

interface TalkjsUserAttributes {
    name: string;
    email?: string;
    photoUrl?: string;
    role?: string;
    locale?: string;
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
            this.logger.error('TALKJS_APPID or TALKJS_APIKEY is not configured. Please check your .env file.');
            throw new InternalServerErrorException('TalkJS API keys are not configured.');
        }

        this.talkjsAppId = appId;
        this.talkjsSecretKey = secretKey;
    }

    async upsertUser(userId: string, attributes: TalkjsUserAttributes): Promise<any> {
        const url = `https://api.talkjs.com/v1/${this.talkjsAppId}/users/${userId}`;

        const userData = {
            name: attributes.name,
            email: attributes.email ? [attributes.email] : undefined,
            photoUrl: attributes.photoUrl,
            role: attributes.role,
            locale: attributes.locale,
        };

        try {
            const response = await axios.put(url, userData, {
                headers: {
                    Authorization: `Bearer ${this.talkjsSecretKey}`,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log(`TalkJS user '${userId}' upserted successfully.`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to upsert TalkJS user '${userId}': ${error.message}`);
            throw new InternalServerErrorException(`Failed to upsert user to TalkJS: ${error.message}`);
        }
    }


    async generateTalkjsToken(
        userId: string,
        email: string,
        role: string,
    ): Promise<string> {
        const payload = {
            userId: userId,
            custom: {
                email: email,
                role: role,
            },
        };

        try {
            return jwt.sign(payload, this.talkjsSecretKey, { algorithm: 'HS256', expiresIn: '1h' });
        } catch (error) {
            this.logger.error(`Failed to generate TalkJS token for user '${userId}': ${error.message}`);
            throw new InternalServerErrorException('Failed to generate TalkJS token.');
        }
    }

    async getOrCreateConversation(
        conversationId: string,
        participantIds: string[],
        subject?: string,
    ): Promise<any> {
        const url = `https://api.talkjs.com/v1/${this.talkjsAppId}/conversations/${conversationId}`;

        const conversationData = {
            participants: participantIds.map((id) => ({ userId: id })),
            subject: subject,
        };

        try {
            const response = await axios.put(url, conversationData, {
                headers: {
                    Authorization: `Bearer ${this.talkjsSecretKey}`,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log(`TalkJS conversation '${conversationId}' managed successfully.`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to manage TalkJS conversation '${conversationId}': ${error.message}`);
            throw new InternalServerErrorException(`Failed to manage conversation on TalkJS: ${error.message}`);
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
            this.logger.log(`Message sent to TalkJS conversation '${conversationId}' from '${senderId}'.`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to send message to TalkJS conversation '${conversationId}': ${error.message}`);
            throw new InternalServerErrorException(`Failed to send message via TalkJS: ${error.message}`);
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
            this.logger.error(`Failed to list TalkJS conversations for user '${userId}': ${error.message}`);
            throw new InternalServerErrorException(`Failed to list conversations from TalkJS: ${error.message}`);
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
            this.logger.log(`TalkJS conversation '${conversationId}' deleted successfully.`);
        } catch (error) {
            this.logger.error(`Failed to delete TalkJS conversation '${conversationId}': ${error.message}`);
            throw new InternalServerErrorException(`Failed to delete conversation from TalkJS: ${error.message}`);
        }
    }
}