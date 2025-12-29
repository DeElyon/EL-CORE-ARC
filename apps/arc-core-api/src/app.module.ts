import { Module } from '@nestjs/common';
import { ChatGateway } from './gateways/chat.gateway';
import { StreamGateway } from './gateways/stream.gateway';
import { IdeGateway } from './gateways/ide.gateway';
import { NotificationGateway } from './gateways/notification.gateway';

@Module({
  imports: [],
  providers: [ChatGateway, StreamGateway, IdeGateway, NotificationGateway]
})
export class AppModule {}
