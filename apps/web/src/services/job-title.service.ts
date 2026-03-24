import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";

export interface JobTitle {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    status: "ACTIVE" | "INACTIVE";
    createdAt: string;
    updatedAt: string;
    _count?: {
        employees: number;
    };
    createdBy?: {
        id: string;
        username: string;
        fullName?: string;
    };
    updatedBy?: {
        id: string;
        username: string;
        fullName?: string;
    };
}

export interface JobTitleResponse {
    data: JobTitle[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface CreateJobTitleDto {
    code: string;
    name: string;
    description?: string;
}

export interface UpdateJobTitleDto {
    name?: string;
    description?: string;
    status?: "ACTIVE" | "INACTIVE";
}

export interface JobTitleParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    order?: "asc" | "desc";
    isDeleted?: boolean;
}

const keys = {
    all: ["job-titles"] as const,
    list: (params?: JobTitleParams) => [...keys.all, "list", params] as const,
    detail: (id: string) => [...keys.all, "detail", id] as const,
};

const fetchJobTitles = async (params?: JobTitleParams): Promise<JobTitleResponse> => {
    return apiGet<JobTitleResponse>("/job-titles", params as unknown as Record<string, unknown>);
};

const fetchJobTitle = async (id: string): Promise<JobTitle> => {
    return apiGet<JobTitle>(`/job-titles/${id}`);
};

const createJobTitle = async (data: CreateJobTitleDto): Promise<JobTitle> => {
    return apiPost<JobTitle>("/job-titles", data);
};

const updateJobTitle = async ({ id, ...data }: UpdateJobTitleDto & { id: string }): Promise<JobTitle> => {
    return apiPatch<JobTitle>(`/job-titles/${id}`, data);
};

const deleteJobTitle = async (id: string): Promise<void> => {
    return apiDelete(`/job-titles/${id}`);
};

const bulkDeleteJobTitles = async (ids: string[]): Promise<{ success: number; failed: number; errors: string[] }> => {
    return apiDelete(`/job-titles/bulk`, { data: { ids } });
};

const restoreJobTitle = async (id: string): Promise<JobTitle> => {
    return apiPost<JobTitle>(`/job-titles/${id}/restore`);
};

const forceDeleteJobTitle = async (id: string): Promise<void> => {
    return apiDelete(`/job-titles/${id}/force`);
};

const exportJobTitles = async (params?: JobTitleParams) => {
    const response = await apiGet<Blob>("/job-titles/export", params as Record<string, unknown>, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Export_Chucvu.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
};

const getTemplate = async () => {
    const response = await apiGet<Blob>("/job-titles/template", {}, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Chucvu.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
};

const importJobTitles = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiPost<{ success: number; errors: string[] }>("/job-titles/import", formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

const previewJobTitles = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiPost<{ rows: any[]; errors: string[]; totalRows: number }>("/job-titles/preview", formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// Hooks
export function useJobTitles(params?: JobTitleParams) {
    return useQuery({
        queryKey: keys.list(params),
        queryFn: () => fetchJobTitles(params),
        placeholderData: (previousData) => previousData,
    });
}

export function useJobTitle(id: string) {
    return useQuery({
        queryKey: keys.detail(id),
        queryFn: () => fetchJobTitle(id),
        enabled: !!id,
    });
}

export function useCreateJobTitle() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createJobTitle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: keys.all });
        },
    });
}

export function useUpdateJobTitle() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateJobTitle,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: keys.all });
        },
    });
}

export function useDeleteJobTitle() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteJobTitle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: keys.all });
        },
    });
}

export function useBulkDeleteJobTitles() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bulkDeleteJobTitles,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: keys.all });
        },
    });
}

export function useRestoreJobTitle() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: restoreJobTitle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: keys.all });
        },
    });
}

export function useForceDeleteJobTitle() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: forceDeleteJobTitle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: keys.all });
        },
    });
}

export function useExportJobTitles() {
    return useMutation({
        mutationFn: exportJobTitles,
    });
}

export function useJobTitleTemplate() {
    return useMutation({
        mutationFn: getTemplate,
    });
}

export function useImportJobTitles() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: importJobTitles,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: keys.all });
        },
    });
}

export function usePreviewJobTitles() {
    return useMutation({
        mutationFn: previewJobTitles,
    });
}
