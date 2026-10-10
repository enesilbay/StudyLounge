import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAction } from './admin-action.entity';
import { AdminAuditService } from './admin-audit.service';

/**
 * Yönetici işlem kaydı. Yalnızca entity'ye bağlıdır; Moderasyon ve Yönetim
 * modülleri döngüsüz kullanabilsin diye ayrı tutulur.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AdminAction])],
  providers: [AdminAuditService],
  exports: [AdminAuditService],
})
export class AdminAuditModule {}
