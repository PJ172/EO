import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";

// Types
export type ITAssetStatus = "AVAILABLE" | "IN_USE" | "UNDER_MAINTENANCE" | "RETIRED" | "LOST";

export interface ITAsset {
    id: string;
    code: string;
    name: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    status: ITAssetStatus;
    categoryId?: string;
    category?: { id: string; name: string };
    departmentId?: string;
    department?: { id: string; name: string };
    assignedToId?: string;
    assignedTo?: { id: string; fullName: string; employeeCode: string };
    purchaseDate?: string;
    purchasePrice?: number;
    warrantyEndDate?: string;
    location?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

export interface ITAssetListResponse {
    data: ITAsset[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ITAssetParams {
    search?: string;
    categoryId?: string;
    status?: string;
    departmentId?: string;
    isDeleted?: boolean;
    page?: number;
    limit?: number;
}

// Query Keys
export const itAssetKeys = {
    all: ["it-assets"] as const,
    lists: (params?: ITAssetParams) => [...itAssetKeys.all, "list", params] as const,
    detail: (id: string) => [...itAssetKeys.all, "detail", id] as const,
};

// API Functions
const fetchAssets = (params?: ITAssetParams): Promise<ITAssetListResponse> =>
    apiGet<ITAssetListResponse>("/it-assets", params as Record<string, unknown>);

const fetchAsset = (id: string): Promise<ITAsset> =>
    apiGet<ITAsset>(`/it-assets/${id}`);

const deleteAsset = (id: string): Promise<void> => apiDelete(`/it-assets/${id}`);
const restoreAsset = (id: string): Promise<ITAsset> => apiPost<ITAsset>(`/it-assets/${id}/restore`);
const forceDeleteAsset = (id: string): Promise<void> => apiDelete(`/it-assets/${id}/force`);

// ─── Hooks ──────────────────────────────────────────────────────

export function useITAssets(params?: ITAssetParams) {
    return useQuery({
        queryKey: itAssetKeys.lists(params),
        queryFn: () => fetchAssets(params),
        placeholderData: (prev) => prev,
    });
}

export function useITAsset(id: string) {
    return useQuery({
        queryKey: itAssetKeys.detail(id),
        queryFn: () => fetchAsset(id),
        enabled: !!id,
    });
}

export function useDeleteITAsset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: deleteAsset,
        onSuccess: () => qc.invalidateQueries({ queryKey: itAssetKeys.all }),
    });
}

export function useRestoreITAsset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: restoreAsset,
        onSuccess: () => qc.invalidateQueries({ queryKey: itAssetKeys.all }),
    });
}

export function useForceDeleteITAsset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: forceDeleteAsset,
        onSuccess: () => qc.invalidateQueries({ queryKey: itAssetKeys.all }),
    });
}
