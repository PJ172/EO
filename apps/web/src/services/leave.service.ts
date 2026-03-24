import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete, PaginatedResponse } from "@/lib/api-client";

// Types
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
    startDatetime: string;
    endDatetime: string;
    reason?: string;
    status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
    attachmentFileId?: string;
    leaveType?: LeaveType;
    employee?: {
        fullName: string;
        employeeCode: string;
    };
    approvals?: any[];
    createdAt: string;
}

export interface LeaveListParams {
    page?: number;
    limit?: number;
    status?: string;
    from?: string;
    to?: string;
    type?: "MY_REQUESTS" | "TO_APPROVE";
    search?: string;
    sortBy?: string;
    order?: "asc" | "desc";
}

export interface CreateLeaveDto {
    leaveTypeId: string;
    startDatetime: string;
    endDatetime: string;
    reason?: string;
    attachmentFileId?: string; // Optional for now
}

// Query Keys
export const leaveKeys = {
    all: ["leaves"] as const,
    lists: () => [...leaveKeys.all, "list"] as const,
    list: (params: LeaveListParams) => [...leaveKeys.lists(), params] as const,
    types: ["leaveTypes"] as const,
    details: () => [...leaveKeys.all, "detail"] as const,
    detail: (id: string) => [...leaveKeys.details(), id] as const,
};

// API Functions
const fetchLeaveTypes = async (): Promise<LeaveType[]> => {
    return apiGet<LeaveType[]>("/leaves/types");
};

const fetchLeaves = async (params: LeaveListParams): Promise<PaginatedResponse<LeaveRequest>> => {
    return apiGet<PaginatedResponse<LeaveRequest>>("/leaves", params as unknown as Record<string, unknown>);
};

const createLeave = async (data: CreateLeaveDto): Promise<LeaveRequest> => {
    return apiPost<LeaveRequest>("/leaves", data);
};

const submitLeave = async (id: string): Promise<LeaveRequest> => {
    return apiPatch<LeaveRequest>(`/leaves/${id}/submit`, {});
};

const cancelLeave = async (id: string): Promise<LeaveRequest> => {
    return apiPatch<LeaveRequest>(`/leaves/${id}/cancel`, {});
};

const approveLeave = async ({ id, decision, comment }: { id: string; decision: "APPROVED" | "REJECTED"; comment?: string }) => {
    return apiPost<any>(`/leaves/${id}/approve`, { decision, comment });
};

// Hooks
export function useLeaveTypes() {
    return useQuery({
        queryKey: leaveKeys.types,
        queryFn: fetchLeaveTypes,
    });
}

export function useLeaves(params: LeaveListParams = {}) {
    return useQuery({
        queryKey: leaveKeys.list(params),
        queryFn: () => fetchLeaves(params),
    });
}

export function useCreateLeave() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createLeave,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leaveKeys.lists() });
        },
    });
}

export function useSubmitLeave() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: submitLeave,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leaveKeys.lists() });
        },
    });
}

export function useCancelLeave() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: cancelLeave,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leaveKeys.lists() });
        },
    });
}

export function useApproveLeave() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: approveLeave,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leaveKeys.lists() });
        },
    });
}
