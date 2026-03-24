import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Position {
    id: string;
    name: string;
    code: string;
    description?: string | null;
    departmentId?: string | null;
    sectionId?: string | null;
    parentPositionId?: string | null;
    uiPositionX?: number | null;
    uiPositionY?: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    department?: { id: string; name: string } | null;
    section?: { id: string; name: string } | null;
    parent?: { id: string; name: string; code: string } | null;
    children?: { id: string; name: string; code: string; isActive: boolean }[];
    currentHolders?: { id: string; fullName: string; avatar?: string; employeeCode: string }[];
    _count?: { assignments: number };
}

export interface EmployeePositionHolder {
    id: string;
    employeeId: string;
    positionId: string;
    startDate: string;
    endDate?: string | null;
    isPrimary: boolean;
    note?: string | null;
    employee: {
        id: string;
        fullName: string;
        avatar?: string;
        employeeCode: string;
        jobTitle?: { name: string } | null;
        department?: { name: string } | null;
    };
}

export interface CreatePositionInput {
    name: string;
    code: string;
    description?: string;
    departmentId?: string;
    sectionId?: string;
    parentPositionId?: string;
}

export type UpdatePositionInput = Partial<CreatePositionInput> & {
    isActive?: boolean;
    uiPositionX?: number;
    uiPositionY?: number;
};

export interface AssignEmployeeInput {
    employeeId: string;
    startDate: string;
    endDate?: string;
    isPrimary?: boolean;
    note?: string;
}

export interface OrgChartTreeData {
    nodes: any[];
    edges: any[];
}

export const positionService = {
    getAll: (params?: { departmentId?: string; sectionId?: string; isActive?: boolean }) =>
        apiGet<Position[]>("/positions", params as any),
    getOne: (id: string) => apiGet<Position>(`/positions/${id}`),
    create: (data: CreatePositionInput) => apiPost<Position>("/positions", data),
    update: (id: string, data: UpdatePositionInput) => apiPatch<Position>(`/positions/${id}`, data),
    delete: (id: string) => apiDelete(`/positions/${id}`),
    getHolders: (id: string) => apiGet<EmployeePositionHolder[]>(`/positions/${id}/holders`),
    assign: (id: string, data: AssignEmployeeInput) => apiPost<any>(`/positions/${id}/assign`, data),
    unassign: (positionId: string, employeeId: string) =>
        apiDelete(`/positions/${positionId}/assign/${employeeId}`),
    getTree: (departmentId?: string) =>
        apiGet<OrgChartTreeData>("/positions/tree", departmentId ? { departmentId } : undefined),
};

export function usePositions(params?: { departmentId?: string; sectionId?: string; isActive?: boolean }) {
    return useQuery({
        queryKey: ["positions", params],
        queryFn: () => positionService.getAll(params),
    });
}

export function usePosition(id: string | null) {
    return useQuery({
        queryKey: ["positions", id],
        queryFn: () => positionService.getOne(id!),
        enabled: !!id,
    });
}

export function usePositionHolders(id: string | null) {
    return useQuery({
        queryKey: ["positions", id, "holders"],
        queryFn: () => positionService.getHolders(id!),
        enabled: !!id,
    });
}

export function usePositionTree(departmentId?: string) {
    return useQuery({
        queryKey: ["positions", "tree", departmentId],
        queryFn: () => positionService.getTree(departmentId),
    });
}

export function useCreatePosition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: positionService.create,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["positions"] }),
    });
}

export function useUpdatePosition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: UpdatePositionInput & { id: string }) =>
            positionService.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["positions"] }),
    });
}

export function useDeletePosition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: positionService.delete,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["positions"] }),
    });
}

export function useAssignEmployee() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ positionId, data }: { positionId: string; data: AssignEmployeeInput }) =>
            positionService.assign(positionId, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["positions"] }),
    });
}

export function useUnassignEmployee() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ positionId, employeeId }: { positionId: string; employeeId: string }) =>
            positionService.unassign(positionId, employeeId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["positions"] }),
    });
}
