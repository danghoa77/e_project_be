// libs/talkjs-common/src/talkjs.module.ts
import { Module, Global } from '@nestjs/common';
import { TalkjsService } from './talkjs.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [
    ConfigModule,
    HttpModule,
  ],
  providers: [TalkjsService],
  exports: [TalkjsService],
})
export class TalkjsModule { }
