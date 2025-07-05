// libs/talkjs-common/src/talkjs.module.ts
import { Module, Global } from '@nestjs/common';
import { TalkjsService } from './talkjs.service';

@Global()
@Module({
  providers: [TalkjsService],
  exports: [TalkjsService],
})
export class TalkjsModule {}
