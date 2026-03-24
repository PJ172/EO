import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete, PaginatedResponse } from "@/lib/api-client";
import { toast } from "@/components/ui/toaster";

// Types
export interface Employee {
    id: string;
    employeeCode: string;
    fullName: string;
    age?: number;
    dob?: string;
    phone?: string;
    emailCompany?: string;
    avatar?: string;
    companyId?: string;
    factoryId?: string;
    divisionId?: string;
    departmentId?: string;
    sectionId?: string;
    jobTitleId?: string;
    managerEmployeeId?: string;
    employmentStatus: "PROBATION" | "OFFICIAL" | "SEASONAL" | "RESIGNED" | "MATERNITY_LEAVE";
    showOnOrgChart: boolean;
    joinedAt?: string;
    resignedAt?: string;
    createdAt: string;
    updatedAt: string;
    // Personal Info
    gender?: "MALE" | "FEMALE" | "OTHER";
    maritalStatus?: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
    permanentAddress?: string;
    temporaryAddress?: string;
    birthPlace?: string;
    ethnicity?: string;
    religion?: string;
    personalEmail?: string;
    note?: string;
    // CMND/CCCD
    nationalId?: string;
    placeOfIssue?: string;
    dateOfIssue?: string;
    // Bank Info
    bankName?: string;
    bankBranch?: string;
    bankAccountNo?: string;
    // Insurance & Tax
    socialInsuranceNo?: string;
    healthInsuranceNo?: string;
    taxCode?: string;
    // Uniform & Assets
    recordCode?: string;
    salaryLevel?: string;
    accessCardId?: string;
    accessCardStatus?: string;
    uniformPantsSize?: string;
    uniformShirtSize?: string;
    shoeSize?: string;
    documentFile?: string;
    emergencyPhone?: string;
    emergencyContactName?: string;
    referrer?: string;
    // Contract
    contractNumber?: string;
    contractType?: "PROBATION" | "DEFINITE_TERM" | "INDEFINITE_TERM" | "SEASONAL" | "ONE_YEAR" | "TWO_YEARS" | "THREE_YEARS";
    contractStartDate?: string;
    contractEndDate?: string;
    // Education
    education?: "PRIMARY" | "SECONDARY" | "HIGH_SCHOOL" | "VOCATIONAL" | "COLLEGE" | "UNIVERSITY" | "MASTER" | "DOCTOR";
    major?: string;
    school?: string;
    graduationYear?: number;
    // Relations
    contracts?: {
        id: string;
        contractNumber: string;
        contractType: string;
        startDate: string;
        endDate?: string;
    }[];
    familyMembers?: {
        id: string;
        name: string;
        relationship: string;
        dob?: string;
        phoneNumber?: string;
        job?: string;
        note?: string;
    }[];
    factory?: {
        id: string;
        name: string;
        code: string;
    };
    division?: {
        id: string;
        name: string;
        code: string;
    };
    company?: {
        id: string;
        name: string;
        code: string;
    };
    section?: {
        id: string;
        name: string;
        code: string;
    };
    department?: {
        id: string;
        name: string;
        parent?: {
            id: string;
            name: string;
        };
    };
    jobTitle?: {
        id: string;
        name: string;
        jobDescriptions?: {
            id: string;
            content: string;
            version: number;
            effectiveDate: string;
        }[];
    };
    manager?: {
        id: string;
        fullName: string;
    };
    createdBy?: {
        id: string;
        username: string;
    };
    updatedBy?: {
        id: string;
        username: string;
    };
}

export interface EmployeeListParams {
    search?: string;
    departmentId?: string;
    status?: string;
    companyId?: string;
    factoryId?: string;
    divisionId?: string;
    sectionId?: string;
    jobTitleId?: string;
    dobFrom?: string;
    dobTo?: string;
    joinedFrom?: string;
    joinedTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: "asc" | "desc";
    isDeleted?: boolean;
}

// Query Keys
export const employeeKeys = {
    all: ["employees"] as const,
    lists: () => [...employeeKeys.all, "list"] as const,
    list: (params: EmployeeListParams) => [...employeeKeys.lists(), params] as const,
    details: () => [...employeeKeys.all, "detail"] as const,
    detail: (id: string) => [...employeeKeys.details(), id] as const,
};

// Input Types
export interface CreateEmployeeInput extends Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'department' | 'jobTitle' | 'manager' | 'contracts' | 'familyMembers'> {
    departmentId?: string;
    sectionId?: string;
    jobTitleId?: string;
    managerEmployeeId?: string;
    contracts?: {
        contractNumber?: string;
        contractType?: string;
        startDate?: string;
        endDate?: string;
    }[];
    familyMembers?: {
        name?: string;
        relationship?: string;
        dob?: string;
        phoneNumber?: string;
        job?: string;
        note?: string;
    }[];
}

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

// API Functions
export const getEmployees = async (params: EmployeeListParams): Promise<PaginatedResponse<Employee>> => {
    return apiGet<PaginatedResponse<Employee>>("/employees", params as unknown as Record<string, unknown>);
};

export const getEmployee = async (id: string): Promise<Employee> => {
    return apiGet<Employee>(`/employees/${id}`);
};

export const createEmployee = async (data: CreateEmployeeInput): Promise<Employee> => {
    return apiPost<Employee>("/employees", data);
};

export const updateEmployee = async ({ id, ...data }: UpdateEmployeeInput & { id: string }): Promise<Employee> => {
    return apiPatch<Employee>(`/employees/${id}`, data);
};

export const deleteEmployee = async (id: string): Promise<{ success: boolean; batchId?: string }> => {
    return apiDelete<{ success: boolean; batchId?: string }>(`/employees/${id}`);
};

export const restoreEmployee = async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiPost<{ success: boolean; message: string }>(`/employees/${id}/restore`, {});
};

export const hardDeleteEmployee = async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiDelete<{ success: boolean; message: string }>(`/employees/${id}/force`);
};

export const bulkDeleteEmployees = async (ids: string[]): Promise<{ success: boolean; count: number; batchId?: string }> => {
    return apiDelete<{ success: boolean; count: number; batchId?: string }>(`/employees/bulk`, { data: { ids } });
};

const fetchEmployeeAttendance = async (id: string): Promise<any[]> => {
    return apiGet<any[]>(`/employees/${id}/attendance`);
};


// Excel Export/Import
const exportEmployees = async (filters?: Partial<EmployeeListParams>) => {
    const params: Record<string, any> = {};
    if (filters?.search) params.search = filters.search;
    if (filters?.status) params.status = filters.status;
    if (filters?.departmentId) params.departmentId = filters.departmentId;
    const response = await apiGet<Blob>("/employees/export", params, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Export_Nhanvien.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
};

const downloadTemplate = async () => {
    const response = await apiGet<Blob>("/employees/template", {}, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response as any]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Nhanvien.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
};

const importEmployees = async ({ file, autoCreateUser = false }: { file: File; autoCreateUser?: boolean }) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("autoCreateUser", String(autoCreateUser));
    return apiPost<{ success: number; errors: string[] }>("/employees/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

const previewEmployees = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiPost<{ rows: any[]; errors: string[]; totalRows: number; headers?: any[] }>("/employees/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};


// Hooks
export function useEmployees(params: EmployeeListParams = {}, options?: any) {
    return useQuery({
        queryKey: employeeKeys.list(params),
        queryFn: () => getEmployees(params),
        placeholderData: (previousData) => previousData, // Keep previous data while fetching
        refetchOnMount: true, // MUST be true so it fetches new data when navigating back after an edit 
        ...options
    });
}

export function useEmployee(id: string, options?: any) {
    return useQuery({
        queryKey: employeeKeys.detail(id),
        queryFn: () => getEmployee(id),
        enabled: !!id,
        ...options
    });
}

export function useCreateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createEmployee,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
        },
    });
}

export const uploadAvatar = async ({ id, file }: { id: string; file: File }) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiPost<{ avatar: string }>(`/employees/${id}/avatar`, formData);
};

export function useUploadAvatar() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: uploadAvatar,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || "Không thể tải lên ảnh đại diện";
            toast.error(Array.isArray(message) ? message.join(", ") : message);
        }
    });
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateEmployee,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
            queryClient.setQueryData(employeeKeys.detail(data.id), data);
        },
    });
}

export function useDeleteEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteEmployee,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
        },
    });
}

export function useRestoreEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: restoreEmployee,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
            toast.success(data.message || "Khôi phục nhân viên thành công");
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Lỗi khi khôi phục nhân viên");
        }
    });
}

export function useHardDeleteEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: hardDeleteEmployee,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
            toast.success(data.message || "Đã xóa vĩnh viễn nhân viên");
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Lỗi khi xóa vĩnh viễn nhân viên");
        }
    });
}

export function useBulkDeleteEmployees() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: bulkDeleteEmployees,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
        },
    });
}

export function useEmployeeAttendance(id: string) {
    return useQuery({
        queryKey: [...employeeKeys.detail(id), "attendance"],
        queryFn: () => fetchEmployeeAttendance(id),
        enabled: !!id,
    });
}

export function useExportEmployees() {
    return useMutation({
        mutationFn: exportEmployees,
    });
}

export function useDownloadTemplate() {
    return useMutation({
        mutationFn: downloadTemplate,
    });
}

// Job Titles
const fetchJobTitles = async (): Promise<PaginatedResponse<{ id: string; name: string; code: string }>> => {
    return apiGet<PaginatedResponse<{ id: string; name: string; code: string }>>("/job-titles?limit=1000");
};

export function useJobTitles() {
    return useQuery({
        queryKey: ["job-titles"],
        queryFn: fetchJobTitles,
    });
}

export function useImportEmployees() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: importEmployees,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
        },
    });
}

export function usePreviewEmployees() {
    return useMutation({
        mutationFn: previewEmployees,
    });
}

// ===================== EMPLOYMENT EVENTS =====================

export interface EmploymentEvent {
    id: string;
    employeeId: string;
    eventType: "PROBATION" | "OFFICIAL" | "RESIGNED" | "MATERNITY_LEAVE" | "RETURN_TO_WORK" | "SUSPENDED";
    effectiveDate: string;
    endDate?: string;
    decisionNumber?: string;
    reason?: string;
    note?: string;
    createdAt: string;
}

export interface CreateEmploymentEventInput {
    eventType: string;
    effectiveDate: string;
    endDate?: string;
    decisionNumber?: string;
    reason?: string;
    note?: string;
}

export const getEmploymentEvents = async (employeeId: string): Promise<EmploymentEvent[]> => {
    return apiGet<EmploymentEvent[]>(`/employees/${employeeId}/events`);
};

export const createEmploymentEvent = async ({ employeeId, ...data }: CreateEmploymentEventInput & { employeeId: string }): Promise<EmploymentEvent> => {
    return apiPost<EmploymentEvent>(`/employees/${employeeId}/events`, data);
};

export const updateEmploymentEvent = async ({ employeeId, eventId, ...data }: Partial<CreateEmploymentEventInput> & { employeeId: string; eventId: string }): Promise<EmploymentEvent> => {
    return apiPatch<EmploymentEvent>(`/employees/${employeeId}/events/${eventId}`, data);
};

export const deleteEmploymentEvent = async ({ employeeId, eventId }: { employeeId: string; eventId: string }): Promise<{ success: boolean }> => {
    return apiDelete<{ success: boolean }>(`/employees/${employeeId}/events/${eventId}`);
};

export function useEmploymentEvents(employeeId: string) {
    return useQuery({
        queryKey: [...employeeKeys.detail(employeeId), "events"],
        queryFn: () => getEmploymentEvents(employeeId),
        enabled: !!employeeId,
    });
}

export function useCreateEmploymentEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createEmploymentEvent,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: [...employeeKeys.detail(variables.employeeId), "events"] });
            queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.employeeId) }); // Refresh employee details to get new status
            queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
            toast.success("Tạo biến động nhân sự thành công");
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Không thể tạo biến động nhân sự");
        }
    });
}

export function useUpdateEmploymentEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateEmploymentEvent,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: [...employeeKeys.detail(variables.employeeId), "events"] });
            queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.employeeId) }); // Refresh employee details to get new status
            queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
            toast.success("Cập nhật biến động nhân sự thành công");
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Không thể cập nhật biến động nhân sự");
        }
    });
}

export function useDeleteEmploymentEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteEmploymentEvent,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: [...employeeKeys.detail(variables.employeeId), "events"] });
            toast.success("Xóa biến động nhân sự thành công");
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Không thể xóa biến động nhân sự");
        }
    });
}
