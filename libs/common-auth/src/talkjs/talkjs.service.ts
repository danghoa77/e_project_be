import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import axios, { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

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

const chatMode = new Map<string, 'bot' | 'admin'>();

@Injectable()
export class TalkjsService {
  private readonly logger = new Logger(TalkjsService.name);
  private readonly talkjsAppId: string;
  private readonly talkjsSecretKey: string;
  private readonly cohereApiKey: string;
  private products: any[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const appId = this.configService.get<string>('TALKJS_APPID');
    const secretKey = this.configService.get<string>('TALKJS_APIKEY');
    const cohereApiKey = "Hc61txDj6f2asswfuxXjw1gD6EsBUO7N646iE8pm"

    if (!appId || !secretKey) {
      this.logger.error(
        'TALKJS_APPID or TALKJS_APIKEY is not configured. Please check your .env file.',
      );
      throw new InternalServerErrorException(
        'TalkJS API keys are not configured.',
      );
    }
    if (!cohereApiKey) {
      this.logger.error(
        'GEMINI_API_KEY is not configured. Please check .env file.',
      );
      throw new InternalServerErrorException('Gemini API key is not configured.');
    }

    this.talkjsAppId = appId;
    this.talkjsSecretKey = secretKey;
    this.cohereApiKey = cohereApiKey;
  }


  async upsertUser(user: TalkjsUserAttributes): Promise<unknown> {
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
      const response: AxiosResponse<unknown> = await axios.put(url, userData, {
        headers: {
          Authorization: `Bearer ${this.talkjsSecretKey}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log(`TalkJS user '${talkjsUserId}' upserted successfully.`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to upsert TalkJS user '${talkjsUserId}': ${error}`);
      throw new InternalServerErrorException(
        `Failed to upsert user to TalkJS.`,
      );
    }
  }


  async setChatMode(userId: string, mode: 'bot' | 'admin') {
    chatMode.set(userId, mode);
    this.logger.log(`Set chat mode for ${userId} = ${mode}`);
  }

  async getChatMode(userId: string): Promise<'bot' | 'admin'> {
    return chatMode.get(userId) || 'bot';
  }


  async getProductInfo(): Promise<any[]> {
    const url = 'http://product-service:3000/products';
    try {
      const res = await firstValueFrom(this.httpService.get(url));

      this.products = res.data.products || [];
      return this.products;
    } catch (error) {
      this.logger.error(`Failed to fetch product info: ${error}`);
      throw new InternalServerErrorException('Failed to fetch product info.');
    }
  }
  checkTotal(): boolean {
    return this.products.length > 100;
  }


  async handleUserMessage(
    conversationId: string,
    message: string,
    mode: 'bot' | 'admin',
    type: string = 'text',
  ): Promise<string> {
    if (mode !== 'bot') {
      console.log('Mode is not bot, skipping handleUserMessage');
      return '';
    }

    let productSubset: any[] = await this.getProductInfo();
    console.log('Total products:', productSubset);

    if (this.checkTotal()) {
      const keywords = message
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);

      productSubset = this.products.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return keywords.some((kw) => name.includes(kw) || desc.includes(kw));
      });

      if (productSubset.length === 0) {
        productSubset = this.products.slice(0, 50);
      }
    } else {
      productSubset = this.products;
    }


    const simplifiedProducts = productSubset.map((p) => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      category: typeof p.category === 'object' ? p.category.name : p.category,
      variants: p.variants?.map((v: any) => ({
        color: v.color,
        sizes: v.sizes?.map((s: any) => ({
          size: s.size,
          price: s.price?.$numberInt || s.price,
          salePrice: s.salePrice?.$numberInt || s.salePrice,
          stock: s.stock?.$numberInt || s.stock,
        })),
      })),
    }));

    const prompt = `
User ask: ${message}

Product Information: ${JSON.stringify(simplifiedProducts)}

Instructions:
- Nếu câu hỏi của user có liên quan đến sản phẩm (tên, giá, mô tả, phân loại, v.v) thì hãy trả lời dựa trên Product Information ở trên.
- Nếu không tìm thấy sản phẩm liên quan hoặc user hỏi linh tinh/không rõ ràng, hãy trả lời đúng theo mẫu sau:
"Tôi có các sản phẩm này, bạn cần hỗ trợ gì thì nhắn tôi nhé."
`;

    console.log('Prompt to Cohere:', prompt);
    const aiAnswer = await this.askCohere(prompt);

    const url = `http://user-service:3000/users/admin1st`;
    const res = await firstValueFrom(this.httpService.get<any>(url));
    const support = res.data._id;

    await this.sendMessage(conversationId, support, aiAnswer, type);
    return aiAnswer;
  }



  private async askCohere(prompt: string): Promise<string> {
    try {
      const url = "https://api.cohere.ai/v1/chat";

      console.log('apikey model:', this.cohereApiKey)
      const res = await axios.post(
        url,
        {
          model: "command-a-03-2025",
          message: prompt,
          chat_history: [],
        },
        {
          headers: {
            "Authorization": `Bearer ${this.cohereApiKey}`,
            "Content-Type": "application/json",
          },
        },
      );
      const aiText = res.data?.text;

      if (aiText && typeof aiText === 'string') {
        return aiText;
      } else {
        this.logger.warn('Cohere response format might have changed. Response:', res.data);
        return "Sorry , I'm having trouble processing your request.";
      }
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.logger.error(`Cohere API error: ${e.message}`, e.response?.data);
      } else {
        this.logger.error(`Cohere API error: ${e}`);
      }
      return "Sorry, I'm having trouble processing your request.";
    }
  }







  async sendMessage(
    conversationId: string,
    senderId: string,
    message: string,
    type: string = 'text',
  ): Promise<unknown> {
    const url = `https://api.talkjs.com/v1/${this.talkjsAppId}/conversations/${conversationId}/messages`;
    try {
      const response: AxiosResponse<unknown> = await axios.post(
        url,
        [{ sender: senderId, text: message, type }],
        { headers: { Authorization: `Bearer ${this.talkjsSecretKey}`, 'Content-Type': 'application/json' } },
      );
      this.logger.log(`Message sent to TalkJS conversation '${conversationId}' by '${senderId}'.`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send message to TalkJS conversation '${conversationId}': ${error}`);
      throw new InternalServerErrorException(`Failed to send message via TalkJS.`);
    }
  }

  async listUserConversations(userId: string): Promise<unknown> {
    const url = `https://api.talkjs.com/v1/${this.talkjsAppId}/users/${userId}/conversations`;
    try {
      const response: AxiosResponse<unknown> = await axios.get(url, {
        headers: { Authorization: `Bearer ${this.talkjsSecretKey}` },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to list TalkJS conversations for user '${userId}': ${error}`);
      throw new InternalServerErrorException(`Failed to list conversations from TalkJS.`);
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const url = `https://api.talkjs.com/v1/${this.talkjsAppId}/conversations/${conversationId}`;
    try {
      await axios.delete(url, {
        headers: { Authorization: `Bearer ${this.talkjsSecretKey}` },
      });
    } catch (error) {
      this.logger.error(`Failed to delete TalkJS conversation '${conversationId}': ${error}`);
      throw new InternalServerErrorException(`Failed to delete conversation from TalkJS.`);
    }
  }
}
