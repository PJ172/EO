import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditExcelService } from './audit.excel.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [AuditService, AuditExcelService],
  exports: [AuditService, AuditExcelService],
})
export class AuditModule {}
