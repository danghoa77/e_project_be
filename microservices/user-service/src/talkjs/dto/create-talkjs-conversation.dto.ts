// create-talkjs-conversation.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class CreateTalkjsConversationDto {
    @IsString()
    @IsOptional()
    targetCustomerId?: string;

    @IsString()
    @IsOptional()
    targetAdminId?: string;
}