import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";

export interface Factory {
    id: string;
    code: string;
    name: string;
    address?: string;
    companyId?: string;
    managerEmployeeId?: string | null;
    status: "ACTIVE" | "INACTIVE";
    showOnOrgChart: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy?: { username: string; email: string } | null;
    updatedBy?: { username: string; email: string } | null;
    manager?: { id: string; fullName: string; employeeCode: string; avatar?: string | null; jobTitle?: { name: string } | null } | null;
    company?: { id: string; name: string; code: string } | null;
}

export interface CreateFactoryInput {
    code: string;
    name: string;
    address?: string;
    companyId?: string;
    managerEmployeeId?: string | null;
    status?: "ACTIVE" | "INACTIVE";
    showOnOrgChart?: boolean;
}

export interface UpdateFactoryInput extends Partial<CreateFactoryInput> { }

export interface FactoryQuery {
    [key: string]: unknown;
    search?: string;
    status?: "ACTIVE" | "INACTIVE";
    sort?: string;
    order?: "asc" | "desc";
}

export interface FactoryResponse {
    data: Factory[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface FactoryParams {
    [key: string]: unknown;
    page?: number;
    limit?: number;
    search?: string;
    status?: "ACTIVE" | "INACTIVE";
    sort?: string;
    order?: "asc" | "desc";
    isDeleted?: boolean;
}

export const factoryService = {
    getAll: async (params?: FactoryParams) => {
        return apiGet<FactoryResponse>("/factories", params);
    },

    getOne: async (id: string) => {
        return apiGet<Factory>(`/factories/${id}`);
    },

    create: async (data: CreateFactoryInput) => {
        return apiPost<Factory>("/factories", data);
    },

    update: async (id: string, data: UpdateFactoryInput) => {
        return apiPatch<Factory>(`/factories/${id}`, data);
    },

    delete: async (id: string) => {
        return apiDelete(`/factories/${id}`);
    },

    exportFactories: async (params?: FactoryParams) => {
        const response = await apiGet<Blob>("/factories/export", params, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response as any]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Export_Nhamay.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    downloadTemplate: async () => {
        const response = await apiGet<Blob>("/factories/template", {}, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response as any]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Template_Nhamay.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    importFactories: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return apiPost<{ success: number; errors: string[] }>("/factories/import", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },

    previewFactories: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return apiPost<{ rows: any[]; errors: string[]; totalRows: number }>("/factories/preview", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    }
};

import { useQuery } from "@tanstack/react-query";

export function useFactories(params?: FactoryParams) {
    // If params.isDeleted is true, we should pass it. We use query string syntax to construct URL or rely on apiGet.
    // The `apiGet` function stringifies params correctly, we just need to ensure `isDeleted` is part of `params` object which it is.
    return useQuery({
        queryKey: ["factories", params],
        // The apiGet function already accepts generic objects and turns them into query params.
        // It'll naturally forward `isDeleted=true` to the backend when passed.
        queryFn: () => factoryService.getAll(params),
    });
}

export function useFactory(id: string) {
    return useQuery({
        queryKey: ["factories", id],
        queryFn: () => factoryService.getOne(id),
        enabled: !!id,
    });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateFactory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: factoryService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["factories"] });
        },
    });
}

export function useUpdateFactory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: UpdateFactoryInput & { id: string }) => factoryService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["factories"] });
        },
    });
}

export function useDeleteFactory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: factoryService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["factories"] });
        },
    });
}

export function useRestoreFactory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiPost(`/factories/${id}/restore`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["factories"] });
        },
    });
}

export function useForceDeleteFactory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiDelete(`/factories/${id}/force`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["factories"] });
        },
    });
}

export function useExportFactories() {
    return useMutation({ mutationFn: factoryService.exportFactories });
}

export function useDownloadFactoryTemplate() {
    return useMutation({ mutationFn: factoryService.downloadTemplate });
}

export function useImportFactories() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: factoryService.importFactories,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["factories"] });
        },
    });
}

export function usePreviewFactories() {
    return useMutation({
        mutationFn: factoryService.previewFactories,
    });
}
