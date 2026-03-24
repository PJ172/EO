// ============================================
// eOffice Shared Types
// ============================================

// User & Auth Types
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface TokenPayload {
  sub: string;
  username: string;
  roles: string[];
}

// Role & Permission Types
export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface Permission {
  id: string;
  code: string;
  description?: string;
  module?: string;
}

// Employee Types
export type EmploymentStatus = 'PROBATION' | 'OFFICIAL' | 'RESIGNED';

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  dob?: Date;
  phone?: string;
  emailCompany?: string;
  departmentId?: string;
  jobTitleId?: string;
  managerEmployeeId?: string;
  employmentStatus: EmploymentStatus;
  joinedAt?: Date;
  resignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeListParams {
  search?: string;
  departmentId?: string;
  status?: EmploymentStatus;
  page?: number;
  limit?: number;
}

// Department Types
export type DepartmentStatus = 'ACTIVE' | 'INACTIVE';

export interface Department {
  id: string;
  code: string;
  name: string;
  parentId?: string;
  managerEmployeeId?: string;
  status: DepartmentStatus;
  createdAt: Date;
  updatedAt: Date;
  children?: Department[];
}

// Job Title Types
export interface JobTitle {
  id: string;
  code: string;
  name: string;
  description?: string;
}

// Leave Types
export type LeaveStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ApprovalDecision = 'APPROVED' | 'REJECTED';

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  requiresAttachment: boolean;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDatetime: Date;
  endDatetime: Date;
  reason?: string;
  status: LeaveStatus;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  year: number;
  entitledDays: number;
  usedDays: number;
  remainingDays: number;
}

// Room Booking Types
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export type MeetingRoomStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface MeetingRoom {
  id: string;
  code: string;
  name: string;
  location?: string;
  capacity: number;
  equipments?: string[];
  status: MeetingRoomStatus;
}

export interface RoomBooking {
  id: string;
  roomId: string;
  organizerEmployeeId: string;
  title: string;
  description?: string;
  startDatetime: Date;
  endDatetime: Date;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingParams {
  roomId?: string;
  from?: Date;
  to?: Date;
  organizerEmployeeId?: string;
}

// Document Types
export type DocumentType = 'POLICY' | 'PROCESS';
export type DocumentStatus = 'DRAFT' | 'APPROVED' | 'ARCHIVED';

export interface Document {
  id: string;
  type: DocumentType;
  title: string;
  category?: string;
  tags: string[];
  status: DocumentStatus;
  currentVersionId?: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Audit Types
export type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'CANCEL' | 'VIEW_SENSITIVE';

export interface AuditLog {
  id: string;
  actorUserId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  beforeJson?: Record<string, unknown>;
  afterJson?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}
