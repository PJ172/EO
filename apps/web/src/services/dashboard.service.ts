import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";

// Interfaces
export interface EmployeeStats {
    total: number;
    byStatus: Array<{ status: string; label: string; count: number }>;
    byDepartment: Array<{ departmentId: string | null; departmentName: string; count: number }>;
}

export interface BookingStats {
    today: number;
    thisWeek: number;
    thisMonth: number;
    byRoom: Array<{ roomId: string; roomName: string; count: number }>;
    upcomingToday: Array<{
        id: string;
        title: string;
        roomName: string;
        organizer: string;
        startTime: string;
        endTime: string;
    }>;
}

export interface LeaveStats {
    pendingRequests: number;
    todayLeaves: number;
    monthLeaves: number;
    byType: Array<{ typeId: string; typeName: string; count: number }>;
}

export interface RequestStats {
    pending: number;
    byStatus: Array<{ status: string; label: string; count: number }>;
    byType: Array<{ type: string; label: string; count: number }>;
}

export interface AuditStats {
    totalLogs: number;
    byAction: Array<{ action: string; label: string; count: number }>;
    byEntityType: Array<{ entityType: string; label: string; count: number }>;
    recentActivity: Array<{
        id: string;
        action: string;
        actionLabel: string;
        entityType: string;
        entityLabel: string;
        actor: string;
        createdAt: string;
    }>;
}

export interface DashboardStats {
    employees: EmployeeStats;
    bookings: BookingStats;
    leaves: LeaveStats;
    requests: RequestStats;
    generatedAt: string;
}

// API Functions
const fetchDashboardStats = async (): Promise<DashboardStats> => {
    return apiGet<DashboardStats>("/dashboard/stats");
};

const fetchEmployeeStats = async (): Promise<EmployeeStats> => {
    return apiGet<EmployeeStats>("/dashboard/employees");
};

const fetchBookingStats = async (): Promise<BookingStats> => {
    return apiGet<BookingStats>("/dashboard/bookings");
};

const fetchLeaveStats = async (): Promise<LeaveStats> => {
    return apiGet<LeaveStats>("/dashboard/leaves");
};

const fetchAuditStats = async (): Promise<AuditStats> => {
    return apiGet<AuditStats>("/dashboard/audit");
};

const fetchRequestStats = async (): Promise<RequestStats> => {
    return apiGet<RequestStats>("/dashboard/requests");
};

// Hooks
export function useDashboardStats() {
    return useQuery({
        queryKey: ["dashboard", "stats"],
        queryFn: fetchDashboardStats,
        staleTime: 1000 * 60 * 5, // 5 phút
    });
}

export function useEmployeeStats() {
    return useQuery({
        queryKey: ["dashboard", "employees"],
        queryFn: fetchEmployeeStats,
        staleTime: 1000 * 60 * 5,
    });
}

export function useBookingStats() {
    return useQuery({
        queryKey: ["dashboard", "bookings"],
        queryFn: fetchBookingStats,
        staleTime: 1000 * 60 * 2, // 2 phút cho booking (cần cập nhật thường xuyên hơn)
    });
}

export function useLeaveStats() {
    return useQuery({
        queryKey: ["dashboard", "leaves"],
        queryFn: fetchLeaveStats,
        staleTime: 1000 * 60 * 5,
    });
}

export function useAuditStats() {
    return useQuery({
        queryKey: ["dashboard", "audit"],
        queryFn: fetchAuditStats,
        staleTime: 1000 * 60 * 5,
    });
}

export function useRequestStats() {
    return useQuery({
        queryKey: ["dashboard", "requests"],
        queryFn: fetchRequestStats,
        staleTime: 1000 * 60 * 5,
    });
}
