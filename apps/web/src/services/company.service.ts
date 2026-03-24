import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Company {
    id: string;
    code: string;
    name: string;
    address?: string;
    note?: string;
    managerEmployeeId?: string | null;
    status: "ACTIVE" | "INACTIVE";
    showOnOrgChart: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    createdBy?: { id: string; username: string; email: string } | null;
    updatedBy?: { id: string; username: string; email: string } | null;
    manager?: { id: string; fullName: string; employeeCode: string; avatar?: string | null; jobTitle?: { name: string } | null } | null;
    _count?: { employees: number; factories: number };
}

export interface CreateCompanyInput {
    code: string;
    name: string;
    address?: string;
    note?: string;
    managerEmployeeId?: string | null;
    status?: "ACTIVE" | "INACTIVE";
    showOnOrgChart?: boolean;
}

export type UpdateCompanyInput = Partial<CreateCompanyInput>;

export interface CompanyParams {
    [key: string]: unknown;
    page?: number;
    limit?: number;
    search?: string;
    status?: "ACTIVE" | "INACTIVE";
    sort?: string;
    order?: "asc" | "desc";
    isDeleted?: boolean;
}

export interface CompanyResponse {
    data: Company[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export const companyService = {
    getAll: (params?: CompanyParams) => apiGet<CompanyResponse>("/companies", params),
    getOne: (id: string) => apiGet<Company>(`/companies/${id}`),
    create: (data: CreateCompanyInput) => apiPost<Company>("/companies", data),
    update: (id: string, data: UpdateCompanyInput) => apiPatch<Company>(`/companies/${id}`, data),
    delete: (id: string) => apiDelete(`/companies/${id}`),
    restore: (id: string) => apiPost(`/companies/${id}/restore`),
    forceDelete: (id: string) => apiDelete(`/companies/${id}/force`),
};

export function useCompanies(params?: CompanyParams) {
    return useQuery({
        queryKey: ["companies", params],
        queryFn: () => companyService.getAll(params),
    });
}

export function useCompany(id: string) {
    return useQuery({
        queryKey: ["companies", id],
        queryFn: () => companyService.getOne(id),
        enabled: !!id,
    });
}

export function useCreateCompany() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: companyService.create,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
    });
}

export function useUpdateCompany() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: UpdateCompanyInput & { id: string }) => companyService.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
    });
}

export function useDeleteCompany() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: companyService.delete,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
    });
}

export function useRestoreCompany() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: companyService.restore,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
    });
}

export function useForceDeleteCompany() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: companyService.forceDelete,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
    });
}
