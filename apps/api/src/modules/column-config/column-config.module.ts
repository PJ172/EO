import { Module } from '@nestjs/common';
import { ColumnConfigController } from './column-config.controller';
import { ColumnConfigService } from './column-config.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ColumnConfigController],
  providers: [ColumnConfigService],
  exports: [ColumnConfigService],
})
export class ColumnConfigModule {}
