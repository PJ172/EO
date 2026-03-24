
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface AuditLog {
    id: string;
    actorUserId: string;
    actor?: {
        id: string;
        username: string;
        email: string;
        fullName?: string;
    };
    action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "EXPORT" | "IMPORT";
    entityType: string;
    entityId: string;
    ip?: string;
    computerName?: string;
    userAgent?: string;
    beforeJson?: any;
    afterJson?: any;
    createdAt: string;
}

export interface AuditLogParams {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
    search?: string;
    sortBy?: string;
    order?: "asc" | "desc";
}

export interface AuditLogResponse {
    data: AuditLog[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export const auditApi = {
    getAll: async (params: AuditLogParams) => {
        const { data } = await apiClient.get<AuditLogResponse>("/audit-logs", { params });
        return data;
    },
    exportExcel: async (params: Omit<AuditLogParams, "page" | "limit">) => {
        const response = await apiClient.get("/audit-logs/export/excel", {
            params,
            responseType: "blob",
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        const now = new Date().toLocaleDateString("vi-VN").replace(/\//g, "-");
        link.setAttribute("download", `Nhat_ky_he_thong_${now}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },
};

export const useAuditLogs = (params: AuditLogParams) => {
    return useQuery({
        queryKey: ["audit-logs", params],
        queryFn: () => auditApi.getAll(params),
    });
};

export const useExportAuditLogs = () => {
    return useMutation({
        mutationFn: (params: Omit<AuditLogParams, "page" | "limit">) =>
            auditApi.exportExcel(params),
    });
};
