import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";

// Types
export interface Permission {
    id: string;
    code: string;
    name?: string;
    description?: string;
    module?: string;
}

export interface Role {
    id: string;
    code: string;
    name: string;
    description?: string;
    permissionsCount: number;
    usersCount: number;
    permissions: Permission[];
    createdAt: string;
    deletedAt?: string | null;
}

export interface CreateRoleDto {
    code: string;
    name: string;
    description?: string;
    permissionIds?: string[];
}

export interface UpdateRoleDto {
    name?: string;
    description?: string;
}

// Query Keys
export const roleKeys = {
    all: ["roles"] as const,
    lists: (params?: { isDeleted?: boolean }) => [...roleKeys.all, "list", params] as const,
    detail: (id: string) => [...roleKeys.all, "detail", id] as const,
    permissions: ["permissions"] as const,
};

// API Functions
const fetchRoles = (isDeleted = false): Promise<Role[]> =>
    apiGet<Role[]>("/roles", { isDeleted });

const fetchRole = (id: string): Promise<Role> => apiGet<Role>(`/roles/${id}`);

const createRole = (data: CreateRoleDto): Promise<Role> => apiPost<Role>("/roles", data);

const updateRole = ({ id, ...data }: UpdateRoleDto & { id: string }): Promise<Role> =>
    apiPatch<Role>(`/roles/${id}`, data);

const deleteRole = (id: string): Promise<void> => apiDelete(`/roles/${id}`);
const restoreRole = (id: string): Promise<Role> => apiPost<Role>(`/roles/${id}/restore`);
const forceDeleteRole = (id: string): Promise<void> => apiDelete(`/roles/${id}/force`);

// ─── Hooks ──────────────────────────────────────────────────────

export function useRoles(isDeleted = false) {
    return useQuery({
        queryKey: roleKeys.lists({ isDeleted }),
        queryFn: () => fetchRoles(isDeleted),
        placeholderData: (prev) => prev,
    });
}

export function useRole(id: string) {
    return useQuery({
        queryKey: roleKeys.detail(id),
        queryFn: () => fetchRole(id),
        enabled: !!id,
    });
}

export function useCreateRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createRole,
        onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
    });
}

export function useUpdateRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: updateRole,
        onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
    });
}

export function useDeleteRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: deleteRole,
        onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
    });
}

export function useRestoreRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: restoreRole,
        onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
    });
}

export function useForceDeleteRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: forceDeleteRole,
        onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
    });
}

// ─── Excel Export/Import ────────────────────────────────────────

const importRoles = async ({ file }: { file: File }) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiPost<{ success: number; errors: string[] }>("/roles/import/excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

const previewRoles = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiPost<{ rows: any[]; errors: string[]; totalRows: number; headers?: any[] }>("/roles/preview/excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

const downloadRoleTemplate = async () => {
    const response = await apiGet<Blob>("/roles/template/excel", {}, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Vaitro.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
};

export function useImportRoles() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: importRoles,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: roleKeys.all });
        },
    });
}

export function usePreviewRoles() {
    return useMutation({
        mutationFn: previewRoles,
    });
}

export function useDownloadRoleTemplate() {
    return useMutation({
        mutationFn: downloadRoleTemplate,
    });
}
