import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";

export interface TrashRetentionConfig {
    id: string;
    moduleKey: string;
    moduleName: string;
    retentionDays: number;
    isEnabled: boolean;
    updatedAt: string;
    updatedBy?: { id: string; username: string } | null;
}

export interface UpdateTrashConfigDto {
    retentionDays?: number;
    isEnabled?: boolean;
}

export interface PurgeResult {
    dryRun: boolean;
    purgedAt: string;
    totalPurged: number;
    results: Array<{
        moduleKey: string;
        moduleName: string;
        retentionDays: number;
        purgedCount: number;
        cutoffDate: string;
    }>;
    errors: string[];
}

const QUERY_KEY = ["trash-config"] as const;

export function useTrashConfigs() {
    return useQuery<TrashRetentionConfig[]>({
        queryKey: QUERY_KEY,
        queryFn: () => apiGet<TrashRetentionConfig[]>("/trash-config"),
        staleTime: 1000 * 60 * 5,
    });
}

export function useUpdateTrashConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ moduleKey, dto }: { moduleKey: string; dto: UpdateTrashConfigDto }) =>
            apiPatch<TrashRetentionConfig>(`/trash-config/${moduleKey}`, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}

export function useRunTrashPurge() {
    return useMutation({
        mutationFn: (dryRun: boolean) =>
            apiPost<PurgeResult>(`/trash-config/run-now?dryRun=${dryRun}`),
    });
}
