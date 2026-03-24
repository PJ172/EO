"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";

export const MODULE_VISIBILITY_KEY = ['ui-config', 'modules', 'effective'];

export function useModuleVisibility() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: configs, isLoading } = useQuery({
        queryKey: MODULE_VISIBILITY_KEY,
        queryFn: async () => {
            const res = await apiClient.get('/ui-config/modules');
            return res.data; // Array of { moduleCode: string, isVisible: boolean }
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const isVisible = (moduleCode: string) => {
        if (!configs || !Array.isArray(configs)) return true;
        const config = configs.find((c: any) => c.moduleCode === moduleCode);
        return config ? config.isVisible : true;
    };

    const invalidateVisibility = () => {
        queryClient.invalidateQueries({ queryKey: MODULE_VISIBILITY_KEY });
    };

    return {
        configs,
        isLoading,
        isVisible,
        invalidateVisibility
    };
}
