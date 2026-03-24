import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export interface ImportHistoryRecord {
    id: string;
    moduleKey: string;
    moduleType?: string;
    fileName: string;
    totalRows: number;
    success: number;
    failed: number;
    errors: string[];
    status: "COMPLETED" | "PARTIAL" | "FAILED";
    user?: { username: string; email: string };
    createdAt: string;
}

export interface ImportHistoryResponse {
    data: ImportHistoryRecord[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useImportHistory(moduleKey?: string, page = 1, limit = 10) {
    return useQuery<ImportHistoryResponse>({
        queryKey: ["import-history", moduleKey, page, limit],
        queryFn: async () => {
            const params: Record<string, any> = { page, limit };
            if (moduleKey) params.moduleKey = moduleKey;
            const res = await axios.get("/api/import-history", { params });
            return res.data;
        },
    });
}

export function useDeleteImportHistory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => axios.delete(`/api/import-history/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["import-history"] }),
    });
}
