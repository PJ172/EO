import { Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { TicketWorkflowService } from './ticket-workflow.service';
import { TicketSchedulerService } from './ticket-scheduler.service';

@Module({
  controllers: [TicketController],
  providers: [TicketService, TicketWorkflowService, TicketSchedulerService],
  exports: [TicketService, TicketWorkflowService],
})
export class TicketModule {}
