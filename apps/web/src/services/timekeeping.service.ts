import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, PaginatedResponse } from "@/lib/api-client";

// Types
export interface Attendance {
    id: string;
    employeeId: string;
    date: string;
    checkIn?: string;
    checkOut?: string;
    workMinutes?: number;
    status: "PRESENT" | "LATE" | "EARLY_LEAVE" | "ABSENT" | "ON_LEAVE";
    checkInMethod?: string;
    checkOutMethod?: string;
}

export interface TodayAttendance {
    date: string;
    checkIn?: string;
    checkOut?: string;
    workMinutes?: number;
    status: string;
    isPlaying?: boolean; // For timer logic in UI
}

// Query Keys
export const timekeepingKeys = {
    all: ["timekeeping"] as const,
    today: () => [...timekeepingKeys.all, "today"] as const,
    history: (params: any) => [...timekeepingKeys.all, "history", params] as const,
};

// API Functions
const fetchTodayAttendance = async (): Promise<TodayAttendance> => {
    return apiGet<TodayAttendance>("/timekeeping/today");
};

const checkIn = async (): Promise<Attendance> => {
    return apiPost<Attendance>("/timekeeping/check-in", {});
};

const checkOut = async (): Promise<Attendance> => {
    return apiPost<Attendance>("/timekeeping/check-out", {});
};

const fetchAttendanceHistory = async (params: { from: string; to: string }): Promise<Attendance[]> => {
    return apiGet<Attendance[]>("/timekeeping/history", params as unknown as Record<string, unknown>);
};

// Hooks
export function useTodayAttendance() {
    return useQuery({
        queryKey: timekeepingKeys.today(),
        queryFn: fetchTodayAttendance,
        refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes (reduced from 1 min to lower server load)
    });
}

export function useCheckIn() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: checkIn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: timekeepingKeys.today() });
        },
    });
}

export function useCheckOut() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: checkOut,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: timekeepingKeys.today() });
        },
    });
}

export function useAttendanceHistory(params: { from: string; to: string }) {
    return useQuery({
        queryKey: timekeepingKeys.history(params),
        queryFn: () => fetchAttendanceHistory(params),
        enabled: !!params.from && !!params.to,
    });
}
