import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Section {
    id: string;
    code: string;
    name: string;
    departmentId?: string | null;
    managerEmployeeId?: string | null;
    note?: string;
    status: "ACTIVE" | "INACTIVE";
    showOnOrgChart: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    department?: { id: string; name: string; code: string } | null;
    manager?: { id: string; fullName: string; avatar: string } | null;
    createdBy?: { id: string; username: string; email: string } | null;
    updatedBy?: { id: string; username: string; email: string } | null;
    _count?: { employees: number };
    useManagerDisplayTitle?: boolean;
    managerDisplayTitle?: string | null;
}

export interface CreateSectionInput {
    code: string;
    name: string;
    departmentId?: string | null;
    managerEmployeeId?: string | null;
    note?: string;
    status?: "ACTIVE" | "INACTIVE";
    showOnOrgChart?: boolean;
    useManagerDisplayTitle?: boolean;
    managerDisplayTitle?: string | null;
}

export type UpdateSectionInput = Partial<CreateSectionInput>;

export interface SectionParams {
    [key: string]: unknown;
    page?: number;
    limit?: number;
    search?: string;
    status?: "ACTIVE" | "INACTIVE";
    departmentId?: string;
    sort?: string;
    order?: "asc" | "desc";
    isDeleted?: boolean;
}

export interface SectionResponse {
    data: Section[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export const sectionService = {
    getAll: (params?: SectionParams) => apiGet<SectionResponse>("/sections", params),
    getOne: (id: string) => apiGet<Section>(`/sections/${id}`),
    create: (data: CreateSectionInput) => apiPost<Section>("/sections", data),
    update: (id: string, data: UpdateSectionInput) => apiPatch<Section>(`/sections/${id}`, data),
    delete: (id: string) => apiDelete(`/sections/${id}`),
    restore: (id: string) => apiPost(`/sections/${id}/restore`),
    forceDelete: (id: string) => apiDelete(`/sections/${id}/force`),
};

export function useSections(params?: SectionParams) {
    return useQuery({
        queryKey: ["sections", params],
        queryFn: () => sectionService.getAll(params),
    });
}

export function useSection(id: string) {
    return useQuery({
        queryKey: ["sections", id],
        queryFn: () => sectionService.getOne(id),
        enabled: !!id,
    });
}

export function useCreateSection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: sectionService.create,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sections"] }),
    });
}

export function useUpdateSection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: UpdateSectionInput & { id: string }) => sectionService.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sections"] }),
    });
}

export function useDeleteSection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: sectionService.delete,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sections"] }),
    });
}

export function useRestoreSection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: sectionService.restore,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sections"] }),
    });
}

export function useForceDeleteSection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: sectionService.forceDelete,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sections"] }),
    });
}
