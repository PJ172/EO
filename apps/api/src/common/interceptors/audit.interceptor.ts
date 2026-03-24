import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service'; // Import PrismaService for "Before" state fetching
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../../modules/audit/audit.service';
import { AUDIT_ACTION_KEY } from '../decorators/audit.decorator';
import { Action } from '../../modules/audit/audit.enums';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService, // Inject PrismaService
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const action = this.reflector.get<Action>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { user, ip, headers, method, params, url } = request;
    const userAgent = headers['user-agent'];

    // 1. Fix IP - Get real client IP if behind proxy
    const clientIp = (headers['x-forwarded-for'] || ip || '')
      .split(',')[0]
      .trim();

    // 2. Fix Computer Name - Use User-Agent / Hostname instead of reverse DNS
    // Reverse DNS in Docker often returns gateway.docker.internal which is useless.
    // We will just store the Hostname (if provided) or fallback to generic info
    // Actually, user wants "Computer Name". Browsers don't send this.
    // We can parse OS from UserAgent or just leave it empty/cleaner.
    // Let's store the User-Agent OS part if possible, or just the IP again if they want to identify the machine.
    // For now, let's strictly use IP, and maybe parse OS.
    const computerName = clientIp;

    // 3. Pre-fetch "Before" state for Updates/Deletes
    let beforeJson: any = undefined;
    let entityType = context.getClass().name.replace('Controller', '');
    let entityId = params.id;

    // Custom mapping logic based on URL/Controller
    // BookingController handles both Rooms and Bookings
    if (entityType === 'Booking') {
      if (url.includes('/bookings/rooms')) {
        entityType = 'MeetingRoom';
      } else {
        entityType = 'RoomBooking';
      }
    }

    if ((action === Action.UPDATE || action === Action.DELETE) && entityId) {
      try {
        if (entityType === 'MeetingRoom') {
          beforeJson = await this.prisma.meetingRoom.findUnique({
            where: { id: entityId },
          });
        } else if (entityType === 'RoomBooking') {
          beforeJson = await this.prisma.roomBooking.findUnique({
            where: { id: entityId },
          });
        }
        // Add other mappings here as needed (Department, Employee, etc.)
        else if (entityType === 'Department') {
          beforeJson = await this.prisma.department.findUnique({
            where: { id: entityId },
          });
        } else if (entityType === 'Employee') {
          beforeJson = await this.prisma.employee.findUnique({
            where: { id: entityId },
          });
        }
      } catch (e) {
        // Ignore fetch errors
      }
    }

    return next.handle().pipe(
      tap(async (data) => {
        // Determine Entity ID from result if not in params (for CREATE)
        if (!entityId && data && data.id) {
          entityId = data.id;
        }

        // If DELETE, afterJson is usually null or the deleted object.
        // If UPDATE/CREATE, data is the new object.
        const afterJson = action === Action.DELETE ? null : data;

        try {
          await this.auditService.log({
            actorUserId: user?.sub || user?.id,
            action: action,
            entityType: entityType,
            entityId: entityId || 'unknown',
            ip: clientIp,
            userAgent: userAgent,
            computerName: computerName,
            beforeJson: beforeJson,
            afterJson: afterJson,
          });
        } catch (err) {
          console.error('Audit Log Failed:', err);
        }
      }),
    );
  }
}
