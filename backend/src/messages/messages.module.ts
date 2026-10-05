import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { Message } from './message.entity';
import { DirectMessage } from './direct-message.entity';
import { LobbiesModule } from '../lobbies/lobbies.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [TypeOrmModule.forFeature([Message, DirectMessage]), LobbiesModule, ModerationModule],
  providers: [MessagesService],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}
