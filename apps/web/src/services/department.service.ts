import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Department {
    id: string;
    code: string;
    name: string;
    type: "COMPANY" | "DEPARTMENT" | "DIVISION" | "SECTION" | "team" | "GROUP";
    parentId?: string | null;
    divisionId?: string | null;
    managerEmployeeId?: string | null;
    status: "ACTIVE" | "INACTIVE";
    showOnOrgChart: boolean;
    parent?: {
        id: string;
        name: string;
        code: string;
    };
    division?: {
        id: string;
        name: string;
        code: string;
    };
    manager?: {
        id: string;
        fullName: string;
        employeeCode: string;
        position?: {
            name: string;
        };
    };
    _count?: {
        employees: number;
        children: number;
    };
    createdAt: string;
    updatedAt: string;
    createdBy?: {
        username: string;
        email?: string;
    };
    updatedBy?: {
        username: string;
        email?: string;
    };
    note?: string;
    useManagerDisplayTitle?: boolean;
    managerDisplayTitle?: string | null;
}

export interface CreateDepartmentInput {
    code: string;
    name: string;
    type: "COMPANY" | "DEPARTMENT" | "DIVISION" | "SECTION" | "team" | "GROUP";
    parentId?: string | null;
    managerEmployeeId?: string | null;
    status?: "ACTIVE" | "INACTIVE";
    showOnOrgChart?: boolean;
    useManagerDisplayTitle?: boolean;
    managerDisplayTitle?: string | null;
}

export interface UpdateDepartmentInput extends Partial<CreateDepartmentInput> { }


export interface DepartmentResponse {
    data: Department[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface DepartmentParams {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    order?: "asc" | "desc";
    type?: string;
    isDeleted?: boolean;
}

export type DepartmentNode = Department & {
    children?: DepartmentNode[];
};

export const departmentKeys = {
    all: ["departments"] as const,
    list: (params?: DepartmentParams) => ["departments", "list", params] as const,
    tree: () => ["departments", "tree"] as const,
    detail: (id: string) => ["departments", "detail", id] as const,
};

const fetchOrgTree = async (): Promise<DepartmentNode[]> => {
    return apiGet<DepartmentNode[]>("/organization/tree");
};

const fetchDepartments = async (params?: DepartmentParams): Promise<DepartmentResponse> => {
    return apiGet<DepartmentResponse>("/organization", params as unknown as Record<string, unknown>);
};

const getDepartment = async (id: string): Promise<Department> => {
    return apiGet<Department>(`/organization/${id}`);
};

const createDepartment = async (data: CreateDepartmentInput): Promise<Department> => {
    return apiPost<Department>("/organization", data);
};

const updateDepartment = async (id: string, data: UpdateDepartmentInput): Promise<Department> => {
    return apiPatch<Department>(`/organization/${id}`, data);
};

const moveDepartment = async (sourceId: string, targetId: string | null): Promise<void> => {
    return apiPost(`/organization/move`, { sourceId, targetId });
};

const deleteDepartment = async (id: string): Promise<{ success: boolean; batchId?: string }> => {
    return apiDelete<{ success: boolean; batchId?: string }>(`/organization/${id}`);
};

const bulkDeleteDepartments = async (ids: string[]): Promise<{ success: number; failed: number; errors: string[] }> => {
    return apiPost<{ success: number; failed: number; errors: string[] }>(`/organization/bulk-delete`, { ids });
};

const exportDepartments = async (params?: { type?: string; search?: string; status?: string; parentCode?: string }) => {
    const response = await apiGet<Blob>("/organization/export", params as Record<string, unknown>, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response as any]));
    const link = document.createElement('a');
    link.href = url;
    let fileName = 'Export_Phongban.xlsx';
    if (params?.type === 'COMPANY') fileName = 'Export_Congty.xlsx';
    else if (params?.type === 'DIVISION') fileName = 'Export_Khoi.xlsx';
    else if (params?.type === 'SECTION') fileName = 'Export_Bophan.xlsx';
    else if (params?.type === 'GROUP') fileName = 'Export_Tonhom.xlsx';

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
};

const downloadTemplate = async (type?: string) => {
    const params = type ? { type } : {};
    const response = await apiGet<Blob>("/organization/template", params, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response as any]));
    const link = document.createElement('a');
    link.href = url;

    let fileName = 'Template_Phongban.xlsx';
    if (type === 'COMPANY') fileName = 'Template_Congty.xlsx';
    else if (type === 'FACTORY') fileName = 'Template_Nhamay.xlsx';
    else if (type === 'DIVISION') fileName = 'Template_Khoi.xlsx';
    else if (type === 'SECTION') fileName = 'Template_Bophan.xlsx';
    else if (type === 'GROUP') fileName = 'Template_Tonhom.xlsx';

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
};

const importDepartments = async ({ file, type }: { file: File; type?: string }) => {
    const formData = new FormData();
    formData.append("file", file);
    const url = type ? `/organization/import?type=${type}` : `/organization/import`;
    return apiPost<{ success: number; errors: string[] }>(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

const previewDepartments = async ({ file, type }: { file: File; type?: string }) => {
    const formData = new FormData();
    formData.append("file", file);
    const url = type ? `/organization/preview?type=${type}` : `/organization/preview`;
    return apiPost<{ rows: any[], errors: string[], totalRows: number }>(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

const getNextCode = async (type: string, prefix: string): Promise<{ nextCode: string }> => {
    return apiGet<{ nextCode: string }>(`/organization/next-code`, { type, prefix });
};

export const departmentService = {
    fetchOrgTree,
    fetchDepartments,
    getDepartment,
    createDepartment,
    updateDepartment,
    moveDepartment,
    deleteDepartment,
    bulkDeleteDepartments,
    exportDepartments,
    downloadTemplate,
    importDepartments,
    previewDepartments,
    getNextCode,
};

// Các Hooks

export function useOrgTree() {
    return useQuery({
        queryKey: departmentKeys.tree(),
        queryFn: fetchOrgTree,
    });
}

export function useDepartments(params?: DepartmentParams) {
    return useQuery({
        queryKey: departmentKeys.list(params),
        queryFn: () => fetchDepartments(params),
        placeholderData: (previousData) => previousData,
    });
}

export function useDepartment(id: string) {
    return useQuery({
        queryKey: departmentKeys.detail(id),
        queryFn: () => getDepartment(id),
        enabled: !!id,
    });
}

export function useCreateDepartment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: departmentKeys.all });
        },
    });
}

export function useUpdateDepartment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: UpdateDepartmentInput & { id: string }) =>
            updateDepartment(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: departmentKeys.all });
        },
    });
}

export function useMoveDepartment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string | null }) =>
            moveDepartment(sourceId, targetId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: departmentKeys.tree() });
            queryClient.invalidateQueries({ queryKey: departmentKeys.list() });
        },
    });
}

export function useDeleteDepartment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: departmentKeys.all });
        },
    });
}

export function useBulkDeleteDepartments() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bulkDeleteDepartments,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: departmentKeys.all });
        },
    });
}

export function useExportDepartments() {
    return useMutation({ mutationFn: exportDepartments });
}

export function useDownloadTemplate() {
    return useMutation({ mutationFn: downloadTemplate });
}

export function useImportDepartments() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ file, type }: { file: File; type?: string }) =>
            importDepartments({ file, type }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: departmentKeys.all });
        },
    });
}

export function usePreviewDepartments() {
    return useMutation({
        mutationFn: ({ file, type }: { file: File; type?: string }) =>
            previewDepartments({ file, type }),
    });
}

export function useRestoreDepartment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiPost(`/organization/${id}/restore`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: departmentKeys.all });
        },
    });
}

export function useNextCode(type: string, prefix: string, enabled: boolean = true) {
    return useQuery({
        queryKey: ['departments', 'next-code', type, prefix],
        queryFn: () => getNextCode(type, prefix),
        enabled: enabled && !!type && !!prefix,
        staleTime: 0,
        gcTime: 1000 * 60 * 5,
    });
}

export function useBulkUpdateOrgChart() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ type, showOnOrgChart }: { type: string; showOnOrgChart: boolean }) =>
            apiPatch(`/organization/bulk-org-chart?type=${type}`, { showOnOrgChart }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: departmentKeys.all });
            queryClient.invalidateQueries({ queryKey: departmentKeys.tree() });
        },
    });
}
