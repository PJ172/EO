"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { MODULE_VISIBILITY_KEY } from "@/hooks/use-module-visibility";

export const ALL_MODULE_CONFIGS_KEY = ['ui-config', 'modules', 'all-saved'];

export interface ModuleVisibilityPreset {
    targetType: string;
    targetId: string | null;
    name?: string;
    updatedAt: string;
    updatedBy?: {
        username: string;
        employee?: { fullName: string };
    };
    modules: { moduleCode: string; isVisible: boolean }[];
}

export interface BulkUpdateVisibilityRequest {
    targetType: string;
    targetId: string | null;
    configs: { moduleCode: string; isVisible: boolean }[];
    name?: string;
}

export function useAllModuleConfigs() {
    return useQuery({
        queryKey: ALL_MODULE_CONFIGS_KEY,
        queryFn: async () => {
            const res = await apiClient.get('/ui-config/admin/all-configs');
            return res.data as ModuleVisibilityPreset[];
        },
        staleTime: 2 * 60 * 1000,
    });
}

export function useBulkUpdateVisibility() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: BulkUpdateVisibilityRequest) => {
            const res = await apiClient.post('/ui-config/admin/bulk-visibility', data);
            return res.data;
        },
        onSuccess: () => {
            // Invalidate current visibility results for all users
            queryClient.invalidateQueries({ queryKey: MODULE_VISIBILITY_KEY });
            // Invalidate history
            queryClient.invalidateQueries({ queryKey: ALL_MODULE_CONFIGS_KEY });
        }
    });
}

export function useDeleteModuleConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ targetType, targetId }: { targetType: string; targetId: string | null }) => {
            const res = await apiClient.delete(`/ui-config/admin/bulk-visibility?targetType=${targetType}&targetId=${targetId || ''}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MODULE_VISIBILITY_KEY });
            queryClient.invalidateQueries({ queryKey: ALL_MODULE_CONFIGS_KEY });
        }
    });
}
