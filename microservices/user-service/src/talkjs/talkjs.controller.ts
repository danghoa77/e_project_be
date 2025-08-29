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
  constructor(private readonly talkjsCommonService: TalkjsService) { }
  private readonly logger = new Logger(TalkjsController.name);
  private readonly httpService = new HttpService();
  @Post('token')
  getTalkjsToken(@Req() req: { user: AuthenticatedUser }) {
    const { userId, email, role } = req.user;
    const talkjsToken = this.talkjsCommonService.generateTalkjsToken(
      userId,
      email,
      role,
    );
    return {
      token: talkjsToken,
      appId: this.talkjsCommonService['talkjsAppId'],
    };
  }


  @UseGuards(JwtAuthGuard)
  @Post('conversations')
  async createOrGetConversation(
    @Body() createConversationDto: CreateTalkjsConversationDto,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<any> {
    const { targetCustomerId } = createConversationDto;
    const currentUser = req.user;

    let participantIds: string[];
    let conversationId: string;

    if (currentUser.role === 'customer') {
      try {
        const url = 'http://localhost:3000/users/getAdmin1st';
        const response = await firstValueFrom(this.httpService.get<string>(url));
        const adminId = response.data;
        if (!adminId) {
          throw new BadRequestException(
            'Admin ID is required for a customer to start a conversation.',
          );
        }
        participantIds = [currentUser.userId, adminId];
        conversationId = `customer-${currentUser.userId}-admin-${adminId}`;
      }
      catch (err: any) { throw new BadRequestException(err.message) }
    } else if (currentUser.role === 'admin') {
      if (!targetCustomerId) {
        throw new BadRequestException(
          'Customer ID is required for admin to start a conversation.',
        );
      }
      participantIds = [currentUser.userId, targetCustomerId];
      conversationId = `customer-${targetCustomerId}-admin-${currentUser.userId}`;
    } else {
      throw new UnauthorizedException('Invalid user role for chat.');
    }
    // this.logger.log(
    //   `Creating or getting conversation with ID: ${conversationId} for participants: ${participantIds.join(', ')}`,
    // );
    return this.talkjsCommonService.getOrCreateConversation(
      conversationId,
      participantIds,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('messages')
  async sendMessage(
    @Body() sendMessageDto: SendTalkjsMessageDto,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<any> {
    const { conversationId, message } = sendMessageDto;
    const senderId = req.user.userId;
    return this.talkjsCommonService.sendMessage(
      conversationId,
      senderId,
      message,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  @Get('conversations/me')
  async getMyConversations(
    @Req() req: { user: AuthenticatedUser },
  ): Promise<any> {
    const userId = req.user.userId;
    return this.talkjsCommonService.listUserConversations(userId);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete('conversations/:conversationId')
  @Role('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTalkjsConversation(
    @Param('conversationId') conversationId: string,
  ): Promise<void> {
    await this.talkjsCommonService.deleteConversation(conversationId);
  }
}
