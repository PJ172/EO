import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";

export interface Location {
    id: string;
    code: string;
    prefix: string;
    name: string;
    detail?: string | null;
    status: "ACTIVE" | "INACTIVE";
    description?: string | null;
    note?: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy?: { id: string; username: string };
    updatedBy?: { id: string; username: string };
}

export interface LocationResponse {
    data: Location[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateLocationDto {
    prefix: string;  // 2 ký tự: NM, TD, DL, VP...
    name: string;
    detail?: string;
    status?: "ACTIVE" | "INACTIVE";
    description?: string;
    note?: string;
}

export interface UpdateLocationDto {
    name?: string;
    detail?: string;
    status?: "ACTIVE" | "INACTIVE";
    description?: string;
    note?: string;
}

export interface LocationParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    prefix?: string;
    sortBy?: string;
    order?: "asc" | "desc";
}

const keys = {
    all: ["locations"] as const,
    list: (p?: LocationParams) => [...keys.all, "list", p] as const,
    detail: (id: string) => [...keys.all, "detail", id] as const,
};

export function useLocations(params?: LocationParams) {
    return useQuery({
        queryKey: keys.list(params),
        queryFn: () => apiGet<LocationResponse>("/locations", params as Record<string, unknown>),
        placeholderData: (prev) => prev,
    });
}

export function useLocation(id: string) {
    return useQuery({
        queryKey: keys.detail(id),
        queryFn: () => apiGet<Location>(`/locations/${id}`),
        enabled: !!id,
    });
}

export function useCreateLocation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateLocationDto) => apiPost<Location>("/locations", dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
}

export function useUpdateLocation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...dto }: UpdateLocationDto & { id: string }) =>
            apiPatch<Location>(`/locations/${id}`, dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
}

export function useDeleteLocation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiDelete(`/locations/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
}

export function useBulkDeleteLocations() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (ids: string[]) =>
            apiDelete<{ success: number; failed: number; errors: string[] }>("/locations/bulk", { data: { ids } }),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
}
