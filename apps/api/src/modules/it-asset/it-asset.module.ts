import { Module } from '@nestjs/common';
import { ITAssetService } from './it-asset.service';
import { ITAssetController } from './it-asset.controller';

@Module({
  controllers: [ITAssetController],
  providers: [ITAssetService],
  exports: [ITAssetService],
})
export class ITAssetModule {}
