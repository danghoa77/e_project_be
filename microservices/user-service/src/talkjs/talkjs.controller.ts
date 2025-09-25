import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
  Delete,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  TalkjsService,
  RolesGuard,
  Role,
  JwtAuthGuard,
} from '@app/common-auth';
import { CreateTalkjsConversationDto } from './dto/create-talkjs-conversation.dto';
import { SendTalkjsMessageDto } from './dto/send-talkjs-message.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface AuthenticatedUser {
  userId: string;
  email: string;
  role: 'customer' | 'admin';
}

@Controller('talkjs')
export class TalkjsController {
  constructor(private readonly talkjsService: TalkjsService) { }
  private readonly logger = new Logger(TalkjsController.name);
  private readonly httpService = new HttpService();


  @UseGuards(JwtAuthGuard)
  @Post('mode/set')
  async setChatMode(
    @Req() req: { user: AuthenticatedUser },
    @Body() body: { mode: 'bot' | 'admin' },
  ) {
    await this.talkjsService.setChatMode(req.user.userId, body.mode);
    return { userId: req.user.userId, mode: body.mode };
  }

  @UseGuards(JwtAuthGuard)
  @Get('mode/get')
  async getChatMode(@Req() req: { user: AuthenticatedUser }) {
    const mode = await this.talkjsService.getChatMode(req.user.userId);
    return { userId: req.user.userId, mode };
  }


  @UseGuards(JwtAuthGuard)
  @Post('messages')
  async sendMessage(
    @Body() sendMessageDto: SendTalkjsMessageDto,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<any> {
    const { conversationId, message } = sendMessageDto;
    const senderId = req.user.userId;
    return this.talkjsService.sendMessage(conversationId, senderId, message);
  }

  @UseGuards(JwtAuthGuard)
  @Post('messages/handle')
  async handleMessage(
    @Body()
    body: {
      conversationId: string;
      message: string;
      type?: string;
    },
    @Req() req: { user: AuthenticatedUser },
  ): Promise<any> {
    const senderId = req.user.userId;
    const mode = await this.talkjsService.getChatMode(senderId);
    return this.talkjsService.handleUserMessage(
      body.conversationId,
      body.message,
      mode,
      body.type || 'text',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @Get('conversations/me')
  async getMyConversations(@Req() req: { user: AuthenticatedUser }) {
    const userId = req.user.userId;
    return this.talkjsService.listUserConversations(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete('conversations/:conversationId')
  @Role('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTalkjsConversation(
    @Param('conversationId') conversationId: string,
  ): Promise<void> {
    await this.talkjsService.deleteConversation(conversationId);
  }
}
