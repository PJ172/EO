import { Module } from '@nestjs/common';
import { JobTitleController } from './job-title.controller';
import { JobTitleService } from './job-title.service';
import { JobTitleExcelService } from './job-title.excel.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [JobTitleController],
  providers: [JobTitleService, JobTitleExcelService],
  exports: [JobTitleService],
})
export class JobTitleModule {}
