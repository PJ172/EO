import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, PaginatedResponse } from "@/lib/api-client";

export interface User {
    id: string;
    username: string;
    email: string;
    status: string;
    employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
    };
    roles?: {
        role: {
            name: string;
            code: string;
        };
    }[];
}

export const getUsers = async (params: any = {}): Promise<PaginatedResponse<User>> => {
    return apiGet<PaginatedResponse<User>>("/users", params);
};

export function useUsers(params: any = {}) {
    return useQuery({
        queryKey: ["users", "list", params],
        queryFn: () => getUsers(params),
    });
}

// Users Excel Export/Import
const importUsers = async ({ file, autoCreateUser = true }: { file: File; autoCreateUser?: boolean }) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("autoCreateUser", String(autoCreateUser));
    return apiPost<{ success: number; errors: string[] }>("/users/import/excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

const previewUsers = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiPost<{ rows: any[]; errors: string[]; totalRows: number; headers?: any[] }>("/users/preview/excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

const downloadUserTemplate = async () => {
    const response = await apiGet<Blob>("/users/template/excel", {}, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Taikhoan.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
};

export function useImportUsers() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: importUsers,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
    });
}

export function usePreviewUsers() {
    return useMutation({
        mutationFn: previewUsers,
    });
}

export function useDownloadUserTemplate() {
    return useMutation({
        mutationFn: downloadUserTemplate,
    });
}
const updateUser = async ({ id, ...data }: any) => {
    return apiPatch<User>(`/users/${id}`, data);
};

export function useUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
    });
}
