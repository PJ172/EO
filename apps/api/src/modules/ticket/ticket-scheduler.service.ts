import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

// Định nghĩa hằng số cục bộ để tránh lỗi typing khi Prisma Client chưa sync kịp IDE
const TicketStatus = {
  RESOLVED: 'RESOLVED' as any,
  CLOSED: 'CLOSED' as any,
};

@Injectable()
export class TicketSchedulerService {
  private readonly logger = new Logger(TicketSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tự động đóng ticket sau 48h nếu ở trạng thái RESOLVED mà không có phản hồi
   * Chạy mỗi giờ (0 phút mỗi giờ)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleAutoCloseTickets() {
    this.logger.log('Đang chạy quét tự động đóng ticket...');

    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const ticketsToClose = await this.prisma.ticket.findMany({
      where: {
        status: TicketStatus.RESOLVED,
        resolvedAt: { lte: fortyEightHoursAgo },
        deletedAt: null,
      } as any,
      select: { id: true, code: true },
    });

    if (ticketsToClose.length === 0) {
      this.logger.log('Không có ticket nào cần đóng tự động.');
      return;
    }

    this.logger.log(
      `Tìm thấy ${ticketsToClose.length} ticket cần đóng tự động.`,
    );

    for (const ticket of ticketsToClose) {
      try {
        await (this.prisma as any).$transaction([
          this.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              status: TicketStatus.CLOSED,
              closedAt: new Date(),
            } as any,
          }),
          (this.prisma as any).ticketHistory.create({
            data: {
              ticketId: ticket.id,
              actorId: 'SYSTEM',
              action: 'AUTO_CLOSED',
              oldStatus: TicketStatus.RESOLVED,
              newStatus: TicketStatus.CLOSED,
              comment: 'Hệ thống tự động đóng sau 48h không có phản hồi.',
            },
          }),
        ]);
        this.logger.log(`Đã đóng tự động ticket: ${ticket.code}`);
      } catch (error) {
        this.logger.error(
          `Lỗi khi đóng tự động ticket ${ticket.code}: ${error.message}`,
        );
      }
    }
  }
}
