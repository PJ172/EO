import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TrashService } from '../modules/trash/trash.service';

@Injectable()
export class TrashCleanupCron implements OnModuleInit {
  private readonly logger = new Logger(TrashCleanupCron.name);

  constructor(private readonly trashService: TrashService) {}

  onModuleInit() {
    this.scheduleCleanup();
  }

  private scheduleCleanup() {
    // Basic daily interval checking for expired soft-deletes (every 24H)
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    setInterval(async () => {
      try {
        this.logger.log(
          'Bắt đầu dọn dẹp Thùng rác tự động (các mục > 30 ngày)...',
        );
        const result = await this.trashService.cleanupExpired(30);
        this.logger.log(`Hoàn thành dọn dẹp Thùng rác: ${result.message}`);
      } catch (error) {
        this.logger.error('Lỗi khi dọn dẹp Thùng rác tự động:', error);
      }
    }, ONE_DAY_MS);

    // Also run once on startup after 10 seconds to clean up immediate backlog
    setTimeout(async () => {
      try {
        this.logger.log('Chạy dọn dẹp Thùng rác lúc khởi động...');
        const result = await this.trashService.cleanupExpired(30);
        this.logger.log(
          `Hoàn thành dọn dẹp Thùng rác (khởi động): ${result.message}`,
        );
      } catch (error) {
        this.logger.error('Lỗi dọn dẹp Thùng rác (khởi động):', error);
      }
    }, 10000);
  }
}
