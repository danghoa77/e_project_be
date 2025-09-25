// user-service/src/talkjs/talkjs.module.ts
import { Module } from '@nestjs/common';
import { TalkjsController } from './talkjs.controller';
import { TalkjsModule as CommonTalkjsModule } from '@app/common-auth';

@Module({
  imports: [CommonTalkjsModule],
  controllers: [TalkjsController],
})
export class TalkjsLocalModule { }
