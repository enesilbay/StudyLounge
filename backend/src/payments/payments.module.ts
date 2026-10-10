import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { IyzicoClient } from './iyzico.client';
import { Payment } from './payment.entity';
import {
  IyzicoCallbackController,
  PaymentsController,
} from './payments.controller';
import { PaymentsService } from './payments.service';

/** Premium satin alma (iyzico odeme formu, donemlik; otomatik yenileme yok). */
@Module({
  imports: [TypeOrmModule.forFeature([Payment, User])],
  controllers: [PaymentsController, IyzicoCallbackController],
  providers: [PaymentsService, IyzicoClient],
  exports: [PaymentsService],
})
export class PaymentsModule {}
