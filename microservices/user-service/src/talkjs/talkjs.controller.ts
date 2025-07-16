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

interface AuthenticatedUser {
  _id: string;
  email: string;
  role: 'customer' | 'admin';
}

@Controller('talkjs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TalkjsController {
  constructor(private readonly talkjsCommonService: TalkjsService) {}
  private readonly logger = new Logger(TalkjsController.name);

  @Post('token')
  @Role('customer', 'admin')
  getTalkjsToken(@Req() req: { user: AuthenticatedUser }) {
    const { _id, email, role } = req.user;
    const talkjsToken = this.talkjsCommonService.generateTalkjsToken(
      _id,
      email,
      role,
    );
    return {
      token: talkjsToken,
      appId: this.talkjsCommonService['talkjsAppId'],
    };
  }

  @Post('conversations')
  @Role('customer', 'admin')
  async createOrGetConversation(
    @Body() createConversationDto: CreateTalkjsConversationDto,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<any> {
    this.logger.log('👉 req.user:', req.user);
    const { targetCustomerId, targetAdminId } = createConversationDto;
    const currentUser = req.user;

    let participantIds: string[];
    let conversationId: string;

    if (currentUser.role === 'customer') {
      const adminId = targetAdminId || 'default_admin_id';
      if (!adminId || adminId === 'default_admin_id') {
        throw new BadRequestException(
          'Admin ID is required for a customer to start a conversation.',
        );
      }
      participantIds = [currentUser._id, adminId];
      conversationId = `customer-${currentUser._id}-admin-${adminId}`;
    } else if (currentUser.role === 'admin') {
      if (!targetCustomerId) {
        throw new BadRequestException(
          'Customer ID is required for admin to start a conversation.',
        );
      }
      participantIds = [currentUser._id, targetCustomerId];
      conversationId = `customer-${targetCustomerId}-admin-${currentUser._id}`;
    } else {
      throw new UnauthorizedException('Invalid user role for chat.');
    }
    this.logger.log(
      `Creating or getting conversation with ID: ${conversationId} for participants: ${participantIds.join(', ')}`,
    );
    return this.talkjsCommonService.getOrCreateConversation(
      conversationId,
      participantIds,
    );
  }

  @Post('messages')
  async sendMessage(
    @Body() sendMessageDto: SendTalkjsMessageDto,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<any> {
    const { conversationId, message } = sendMessageDto;
    const senderId = req.user._id;
    return this.talkjsCommonService.sendMessage(
      conversationId,
      senderId,
      message,
    );
  }

  @Get('conversations/me')
  @Role('customer', 'admin')
  async getMyConversations(
    @Req() req: { user: AuthenticatedUser },
  ): Promise<any> {
    const userId = req.user._id;
    return this.talkjsCommonService.listUserConversations(userId);
  }

  @Delete('conversations/:conversationId')
  @Role('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTalkjsConversation(
    @Param('conversationId') conversationId: string,
  ): Promise<void> {
    await this.talkjsCommonService.deleteConversation(conversationId);
  }
}
