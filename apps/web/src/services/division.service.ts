import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Division {
    id: string;
    code: string;
    name: string;
    factoryId?: string | null;
    note?: string;
    status: "ACTIVE" | "INACTIVE";
    showOnOrgChart: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    factory?: { id: string; name: string; code: string } | null;
    createdBy?: { id: string; username: string; email: string } | null;
    updatedBy?: { id: string; username: string; email: string } | null;
    manager?: { id: string; fullName: string; employeeCode: string; avatar?: string | null; jobTitle?: { name: string } | null } | null;
    managerEmployeeId?: string | null;
    _count?: { employees: number; departments: number };
}

export interface CreateDivisionInput {
    code: string;
    name: string;
    factoryId?: string;
    note?: string;
    status?: "ACTIVE" | "INACTIVE";
    showOnOrgChart?: boolean;
}

export type UpdateDivisionInput = Partial<CreateDivisionInput>;

export interface DivisionParams {
    [key: string]: unknown;
    page?: number;
    limit?: number;
    search?: string;
    status?: "ACTIVE" | "INACTIVE";
    factoryId?: string;
    sort?: string;
    order?: "asc" | "desc";
    isDeleted?: boolean;
}

export interface DivisionResponse {
    data: Division[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export const divisionService = {
    getAll: (params?: DivisionParams) => apiGet<DivisionResponse>("/divisions", params),
    getOne: (id: string) => apiGet<Division>(`/divisions/${id}`),
    create: (data: CreateDivisionInput) => apiPost<Division>("/divisions", data),
    update: (id: string, data: UpdateDivisionInput) => apiPatch<Division>(`/divisions/${id}`, data),
    delete: (id: string) => apiDelete(`/divisions/${id}`),
    restore: (id: string) => apiPost(`/divisions/${id}/restore`),
    forceDelete: (id: string) => apiDelete(`/divisions/${id}/force`),
};

export function useDivisions(params?: DivisionParams) {
    return useQuery({
        queryKey: ["divisions", params],
        queryFn: () => divisionService.getAll(params),
    });
}

export function useDivision(id: string) {
    return useQuery({
        queryKey: ["divisions", id],
        queryFn: () => divisionService.getOne(id),
        enabled: !!id,
    });
}

export function useCreateDivision() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: divisionService.create,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["divisions"] }),
    });
}

export function useUpdateDivision() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: UpdateDivisionInput & { id: string }) => divisionService.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["divisions"] }),
    });
}

export function useDeleteDivision() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: divisionService.delete,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["divisions"] }),
    });
}

export function useRestoreDivision() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: divisionService.restore,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["divisions"] }),
    });
}

export function useForceDeleteDivision() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: divisionService.forceDelete,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["divisions"] }),
    });
}
