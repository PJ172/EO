import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";

// Types
export type TicketStatus = "DRAFT" | "DEPT_PENDING" | "IT_PENDING" | "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REOPENED" | "REJECTED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Ticket {
    id: string;
    code: string;
    title: string;
    description?: string;
    status: TicketStatus;
    priority: TicketPriority;
    categoryId?: string;
    category?: { id: string; name: string };
    requesterId: string;
    requester?: { id: string; fullName: string; department?: { name: string } };
    assigneeId?: string;
    assignee?: { id: string; fullName: string };
    slaDeadline?: string;
    resolvedAt?: string;
    closedAt?: string;
    resolution?: string;
    rating?: number;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    _count?: { comments: number };
}

export interface TicketListResponse {
    data: Ticket[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface TicketParams {
    status?: string;
    priority?: string;
    categoryId?: string;
    search?: string;
    isDeleted?: boolean;
    page?: number;
    limit?: number;
}

// Query Keys
export const ticketKeys = {
    all: ["tickets"] as const,
    lists: (params?: TicketParams) => [...ticketKeys.all, "list", params] as const,
    detail: (id: string) => [...ticketKeys.all, "detail", id] as const,
};

// API Functions
const fetchTickets = (params?: TicketParams): Promise<TicketListResponse> =>
    apiGet<TicketListResponse>("/tickets", params as Record<string, unknown>);

const fetchTicket = (id: string): Promise<Ticket> =>
    apiGet<Ticket>(`/tickets/${id}`);

const deleteTicket = (id: string): Promise<void> => apiDelete(`/tickets/${id}`);
const restoreTicket = (id: string): Promise<Ticket> => apiPost<Ticket>(`/tickets/${id}/restore`);
const forceDeleteTicket = (id: string): Promise<void> => apiDelete(`/tickets/${id}/force`);
const approveTicket = (id: string, comment?: string): Promise<void> => apiPost(`/tickets/${id}/approve`, { comment });
const rejectTicket = (id: string, comment: string): Promise<void> => apiPost(`/tickets/${id}/reject`, { comment });

// ─── Hooks ──────────────────────────────────────────────────────

export function useTickets(params?: TicketParams) {
    return useQuery({
        queryKey: ticketKeys.lists(params),
        queryFn: () => fetchTickets(params),
        placeholderData: (prev) => prev,
    });
}

export function useTicket(id: string) {
    return useQuery({
        queryKey: ticketKeys.detail(id),
        queryFn: () => fetchTicket(id),
        enabled: !!id,
    });
}

export function useDeleteTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: deleteTicket,
        onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
    });
}

export function useRestoreTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: restoreTicket,
        onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
    });
}

export function useForceDeleteTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: forceDeleteTicket,
        onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
    });
}

export function useApproveTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, comment }: { id: string; comment?: string }) => approveTicket(id, comment),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ticketKeys.all });
            qc.invalidateQueries({ queryKey: ['my-tickets'] });
        },
    });
}

export function useRejectTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, comment }: { id: string; comment: string }) => rejectTicket(id, comment),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ticketKeys.all });
            qc.invalidateQueries({ queryKey: ['my-tickets'] });
        },
    });
}
