import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut, apiDelete, apiPatch } from "@/lib/api-client";

// Types
export interface ColumnItem {
    key: string;
    label: string;
    visible: boolean;
    order: number;
}

export interface TableColumnConfig {
    id: string;
    moduleKey: string;
    columns: ColumnItem[];
    name?: string;
    applyTo: "ALL" | "ROLE" | "USER" | "NONE";
    targetId?: string;
    createdById: string;
    updatedById?: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: { id: string; username: string; email: string };
    updatedBy?: { id: string; username: string; email: string };
}

export interface UpsertColumnConfigRequest {
    moduleKey: string;
    columns: ColumnItem[];
    name?: string;
    applyTo: "ALL" | "ROLE" | "USER" | "NONE";
    targetId?: string;
}

// Query Keys
export const columnConfigKeys = {
    all: ["column-config"] as const,
    module: (moduleKey: string) => [...columnConfigKeys.all, moduleKey] as const,
    moduleAll: (moduleKey: string) => [...columnConfigKeys.all, moduleKey, "all"] as const,
};

// API Functions
const getConfig = async (moduleKey: string): Promise<TableColumnConfig | null> => {
    try {
        const result = await apiGet<TableColumnConfig | null>(`/column-configs/${moduleKey}?t=${Date.now()}`);
        return result || null;
    } catch {
        return null;
    }
};

const getAllConfigs = async (moduleKey: string): Promise<TableColumnConfig[]> => {
    try {
        const result = await apiGet<TableColumnConfig[]>(`/column-configs/${moduleKey}/all?t=${Date.now()}`);
        return result || [];
    } catch {
        return [];
    }
};

const upsertConfig = async (data: UpsertColumnConfigRequest): Promise<TableColumnConfig> => {
    return apiPut<TableColumnConfig>("/column-configs", data);
};

const updateConfig = async ({ id, data }: { id: string; data: UpsertColumnConfigRequest }): Promise<TableColumnConfig> => {
    return apiPut<TableColumnConfig>(`/column-configs/${id}`, data);
};

const deleteConfig = async (id: string): Promise<void> => {
    return apiDelete(`/column-configs/${id}`);
};

const reorderConfigs = async (items: { id: string; order: number }[]): Promise<void> => {
    return apiPatch(`/column-configs/reorder`, items);
};

// Hooks
export function useColumnConfig(moduleKey: string) {
    return useQuery({
        queryKey: columnConfigKeys.module(moduleKey),
        queryFn: () => getConfig(moduleKey),
        staleTime: 5 * 60 * 1000,
        retry: false,
    });
}

export function useAllColumnConfigs(moduleKey: string) {
    return useQuery({
        queryKey: columnConfigKeys.moduleAll(moduleKey),
        queryFn: () => getAllConfigs(moduleKey),
        staleTime: 2 * 60 * 1000,
        retry: false,
    });
}

export function useUpsertColumnConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: upsertConfig,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: columnConfigKeys.module(variables.moduleKey) });
            queryClient.invalidateQueries({ queryKey: columnConfigKeys.moduleAll(variables.moduleKey) });
        },
    });
}

export function useUpdateColumnConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateConfig,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: columnConfigKeys.module(variables.data.moduleKey) });
            queryClient.invalidateQueries({ queryKey: columnConfigKeys.moduleAll(variables.data.moduleKey) });
        },
    });
}

export function useDeleteColumnConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: columnConfigKeys.all });
        },
    });
}

export function useReorderColumnConfigs() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reorderConfigs,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: columnConfigKeys.all });
        },
    });
}
