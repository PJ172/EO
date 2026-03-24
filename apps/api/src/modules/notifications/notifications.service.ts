import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';

export interface NotificationPayload {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  createdAt?: Date;
}

export type NotificationType =
  | 'LEAVE_SUBMITTED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'BOOKING_CREATED'
  | 'BOOKING_CANCELLED'
  | 'DOCUMENT_PUBLISHED'
  | 'SYSTEM_ANNOUNCEMENT';

@Injectable()
export class NotificationsService {
  constructor(private gateway: NotificationsGateway) {}

  // Send notification to specific user
  notifyUser(userId: string, notification: NotificationPayload) {
    const payload = {
      ...notification,
      id: notification.id || crypto.randomUUID(),
      createdAt: notification.createdAt || new Date(),
    };
    this.gateway.sendToUser(userId, 'notification', payload);
    return payload;
  }

  // Send notification to managers/approvers
  notifyManagers(notification: NotificationPayload) {
    const payload = {
      ...notification,
      id: notification.id || crypto.randomUUID(),
      createdAt: notification.createdAt || new Date(),
    };
    this.gateway.sendToRole('MANAGER', 'notification', payload);
    return payload;
  }

  // Send notification to HR
  notifyHR(notification: NotificationPayload) {
    const payload = {
      ...notification,
      id: notification.id || crypto.randomUUID(),
      createdAt: notification.createdAt || new Date(),
    };
    this.gateway.sendToRole('HR', 'notification', payload);
    return payload;
  }

  // Send notification to admins
  notifyAdmins(notification: NotificationPayload) {
    const payload = {
      ...notification,
      id: notification.id || crypto.randomUUID(),
      createdAt: notification.createdAt || new Date(),
    };
    this.gateway.sendToRole('ADMIN', 'notification', payload);
    return payload;
  }

  // Broadcast to all users
  broadcast(notification: NotificationPayload) {
    const payload = {
      ...notification,
      id: notification.id || crypto.randomUUID(),
      createdAt: notification.createdAt || new Date(),
    };
    this.gateway.broadcast('notification', payload);
    return payload;
  }

  // Leave-specific notifications
  notifyLeaveSubmitted(
    approverId: string,
    employeeName: string,
    leaveId: string,
  ) {
    return this.notifyUser(approverId, {
      type: 'LEAVE_SUBMITTED',
      title: 'Đơn xin nghỉ phép mới',
      message: `${employeeName} đã gửi đơn xin nghỉ phép`,
      data: { leaveId },
    });
  }

  notifyLeaveApproved(employeeId: string, leaveId: string) {
    return this.notifyUser(employeeId, {
      type: 'LEAVE_APPROVED',
      title: 'Đơn nghỉ phép được duyệt',
      message: 'Đơn xin nghỉ phép của bạn đã được phê duyệt',
      data: { leaveId },
    });
  }

  notifyLeaveRejected(employeeId: string, leaveId: string, reason?: string) {
    return this.notifyUser(employeeId, {
      type: 'LEAVE_REJECTED',
      title: 'Đơn nghỉ phép bị từ chối',
      message: reason || 'Đơn xin nghỉ phép của bạn đã bị từ chối',
      data: { leaveId, reason },
    });
  }

  // Booking notifications
  notifyBookingCreated(
    organizerId: string,
    roomName: string,
    bookingId: string,
  ) {
    return this.notifyUser(organizerId, {
      type: 'BOOKING_CREATED',
      title: 'Đặt phòng thành công',
      message: `Bạn đã đặt phòng ${roomName} thành công`,
      data: { bookingId },
    });
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.gateway.isUserOnline(userId);
  }

  // Get online user count
  getOnlineCount(): number {
    return this.gateway.getOnlineCount();
  }
}
