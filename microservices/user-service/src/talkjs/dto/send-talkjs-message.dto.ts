import { IsNotEmpty, IsString } from 'class-validator';

export class SendTalkjsMessageDto {
    @IsString()
    @IsNotEmpty()
    conversationId: string;

    @IsString()
    @IsNotEmpty()
    message: string;
}