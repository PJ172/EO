import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";

export interface Category {
    id: string;
    code: string;
    name: string;
    type?: string | null;
    status: "ACTIVE" | "INACTIVE";
    description?: string | null;
    note?: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy?: { id: string; username: string };
    updatedBy?: { id: string; username: string };
}

export interface CategoryResponse {
    data: Category[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateCategoryDto {
    name: string;
    type?: string;
    status?: "ACTIVE" | "INACTIVE";
    description?: string;
    note?: string;
}

export interface UpdateCategoryDto {
    name?: string;
    type?: string;
    status?: "ACTIVE" | "INACTIVE";
    description?: string;
    note?: string;
}

export interface CategoryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
    sortBy?: string;
    order?: "asc" | "desc";
}

const keys = {
    all: ["categories"] as const,
    list: (p?: CategoryParams) => [...keys.all, "list", p] as const,
    detail: (id: string) => [...keys.all, "detail", id] as const,
};

export function useCategories(params?: CategoryParams) {
    return useQuery({
        queryKey: keys.list(params),
        queryFn: () => apiGet<CategoryResponse>("/categories", params as Record<string, unknown>),
        placeholderData: (prev) => prev,
    });
}

export function useCategory(id: string) {
    return useQuery({
        queryKey: keys.detail(id),
        queryFn: () => apiGet<Category>(`/categories/${id}`),
        enabled: !!id,
    });
}

export function useCreateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateCategoryDto) => apiPost<Category>("/categories", dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
}

export function useUpdateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...dto }: UpdateCategoryDto & { id: string }) =>
            apiPatch<Category>(`/categories/${id}`, dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
}

export function useDeleteCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiDelete(`/categories/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
}

export function useBulkDeleteCategories() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (ids: string[]) =>
            apiDelete<{ success: number; failed: number; errors: string[] }>("/categories/bulk", { data: { ids } }),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
}
