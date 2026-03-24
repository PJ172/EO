import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";

// Types
export type KPIStatus = "DRAFT" | "SUBMITTED" | "REVIEWED" | "FINALIZED";

export interface KPIItem {
    id: string;
    name: string;
    target?: string;
    actual?: string;
    weight: number;
    score?: number;
    comment?: string;
}

export interface KPIPeriod {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
}

export interface EmployeeKPI {
    id: string;
    employeeId: string;
    periodId: string;
    period?: KPIPeriod;
    status: KPIStatus;
    totalScore?: number;
    evaluatorId?: string;
    items: KPIItem[];
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

// Query Keys
export const kpiKeys = {
    all: ["kpi"] as const,
    employee: (employeeId: string, isDeleted?: boolean) =>
        [...kpiKeys.all, "employee", employeeId, { isDeleted }] as const,
    byPeriod: (periodId: string) => [...kpiKeys.all, "period", periodId] as const,
    detail: (id: string) => [...kpiKeys.all, "detail", id] as const,
    periods: () => [...kpiKeys.all, "periods"] as const,
};

// API Functions
const fetchEmployeeKPIs = (employeeId: string): Promise<EmployeeKPI[]> =>
    apiGet<EmployeeKPI[]>(`/kpi/employee/${employeeId}`);

const fetchKPI = (id: string): Promise<EmployeeKPI> =>
    apiGet<EmployeeKPI>(`/kpi/${id}`);

const deleteKPI = (id: string): Promise<void> => apiDelete(`/kpi/${id}`);
const restoreKPI = (id: string): Promise<EmployeeKPI> => apiPost<EmployeeKPI>(`/kpi/${id}/restore`);
const forceDeleteKPI = (id: string): Promise<void> => apiDelete(`/kpi/${id}/force`);

// ─── Hooks ──────────────────────────────────────────────────────

export function useEmployeeKPIs(employeeId: string) {
    return useQuery({
        queryKey: kpiKeys.employee(employeeId),
        queryFn: () => fetchEmployeeKPIs(employeeId),
        enabled: !!employeeId,
    });
}

export function useKPI(id: string) {
    return useQuery({
        queryKey: kpiKeys.detail(id),
        queryFn: () => fetchKPI(id),
        enabled: !!id,
    });
}

export function useDeleteKPI() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: deleteKPI,
        onSuccess: () => qc.invalidateQueries({ queryKey: kpiKeys.all }),
    });
}

export function useRestoreKPI() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: restoreKPI,
        onSuccess: () => qc.invalidateQueries({ queryKey: kpiKeys.all }),
    });
}

export function useForceDeleteKPI() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: forceDeleteKPI,
        onSuccess: () => qc.invalidateQueries({ queryKey: kpiKeys.all }),
    });
}
