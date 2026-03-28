import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface TicketCategory {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    slaHours: number;
    _count?: { tickets: number };
}

export interface TicketComment {
    id: string;
    content: string;
    isInternal: boolean;
    createdAt: string;
    author: { id: string; fullName: string };
}

export interface Ticket {
    id: string;
    code: string;
    title: string;
    description: string;
    categoryId: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    status: "DRAFT" | "DEPT_PENDING" | "IT_PENDING" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REJECTED";
    requesterId: string;
    assigneeId?: string | null;
    assetId?: string | null;
    slaDeadline?: string | null;
    resolvedAt?: string | null;
    closedAt?: string | null;
    resolution?: string | null;
    rating?: number | null;
    createdAt: string;
    updatedAt: string;
    category: TicketCategory;
    requester: {
        id: string;
        fullName: string;
        employeeCode: string;
        department?: { name: string };
    };
    assignee?: { id: string; fullName: string; employeeCode: string } | null;
    comments?: TicketComment[];
    _count?: { comments: number };
}

export interface TicketStatistics {
    total: number;
    byStatus: { status: string; count: number }[];
    byPriority: { priority: string; count: number }[];
    byCategory: { category: string; count: number }[];
    avgResolutionHours: number;
    slaCompliancePercent: number;
    totalResolved: number;
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
    page?: number;
    limit?: number;
    isDeleted?: boolean;
}

export const ticketKeys = {
    all: ["tickets"] as const,
    list: (params?: TicketParams) => ["tickets", "list", params] as const,
    detail: (id: string) => ["tickets", "detail", id] as const,
    myTickets: () => ["tickets", "my"] as const,
    assignedToMe: () => ["tickets", "assigned"] as const,
    statistics: () => ["tickets", "statistics"] as const,
    categories: () => ["tickets", "categories"] as const,
    pendingApprovals: () => ["tickets", "pending-approvals"] as const,
};

// Fetchers
const fetchTickets = (params?: TicketParams) => apiGet<TicketListResponse>("/tickets", params as any);
const fetchTicket = (id: string) => apiGet<Ticket>(`/tickets/${id}`);
const fetchMyTickets = () => apiGet<Ticket[]>("/tickets/my-tickets");
const fetchAssignedToMe = () => apiGet<Ticket[]>("/tickets/assigned-to-me");
const fetchStatistics = () => apiGet<TicketStatistics>("/tickets/statistics");
const fetchCategories = () => apiGet<TicketCategory[]>("/tickets/categories");
const fetchPendingApprovals = () => apiGet<any[]>("/tickets/pending-approvals");

// Hooks — Queries
export function useTickets(params?: TicketParams) {
    return useQuery({
        queryKey: ticketKeys.list(params),
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

export function useMyTickets() {
    return useQuery({ queryKey: ticketKeys.myTickets(), queryFn: fetchMyTickets });
}

export function useAssignedToMe() {
    return useQuery({ queryKey: ticketKeys.assignedToMe(), queryFn: fetchAssignedToMe });
}

export function useTicketStatistics() {
    return useQuery({ queryKey: ticketKeys.statistics(), queryFn: fetchStatistics });
}

export function useTicketCategories() {
    return useQuery({ queryKey: ticketKeys.categories(), queryFn: fetchCategories });
}

export function usePendingApprovals() {
    return useQuery({ queryKey: ticketKeys.pendingApprovals(), queryFn: fetchPendingApprovals });
}

// Hooks — Mutations
export function useCreateTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { title: string; description: string; categoryId: string; priority?: string; assetId?: string }) =>
            apiPost<Ticket>("/tickets", data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ticketKeys.all }); },
    });
}

export function useAssignTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string }) =>
            apiPost(`/tickets/${id}/assign`, { assigneeId }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ticketKeys.all }); },
    });
}

export function useStartProgress() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiPost(`/tickets/${id}/start`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ticketKeys.all }); },
    });
}

export function useResolveTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
            apiPost(`/tickets/${id}/resolve`, { resolution }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ticketKeys.all }); },
    });
}

export function useCloseTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiPost(`/tickets/${id}/close`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ticketKeys.all }); },
    });
}

export function useReopenTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiPost(`/tickets/${id}/reopen`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ticketKeys.all }); },
    });
}

export function useApproveTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
            apiPost(`/tickets/${id}/approve`, { comment }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ticketKeys.all }); },
    });
}

export function useRejectTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, comment }: { id: string; comment: string }) =>
            apiPost(`/tickets/${id}/reject`, { comment }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ticketKeys.all }); },
    });
}

export function useRateTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, rating }: { id: string; rating: number }) =>
            apiPost(`/tickets/${id}/rate`, { rating }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ticketKeys.all }); },
    });
}

export function useAddComment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, content, isInternal }: { id: string; content: string; isInternal?: boolean }) =>
            apiPost(`/tickets/${id}/comments`, { content, isInternal }),
        onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ticketKeys.detail(vars.id) }); },
    });
}

export function useDeleteTicket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiDelete(`/tickets/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ticketKeys.all }); },
    });
}

export function useCreateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; description?: string; icon?: string; slaHours?: number }) =>
            apiPost<TicketCategory>("/tickets/categories", data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ticketKeys.categories() }); },
    });
}
