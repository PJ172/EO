import { apiGet, apiPost, apiDelete } from '@/lib/api-client';

const BASE_URL = '/trash';

export type TrashModule = 'employees' | 'departments' | 'users' | 'jobTitles' | 'factories'
    | 'documents' | 'projects' | 'newsArticles' | 'itAssets' | 'tickets' | 'roles' | 'tasks' | 'files' | 'kpi'
    | 'companies' | 'divisions' | 'sections';

export interface TrashItem {
    id: string;
    module: TrashModule;
    name: string;
    code: string;
    extraInfo: string;
    deletedAt: string;
    deletedBy: string;
    deletedBatchId: string | null;
}

export interface TrashSummary {
    employees: { count: number; label: string };
    departments: { count: number; label: string };
    users: { count: number; label: string };
    jobTitles: { count: number; label: string };
    factories: { count: number; label: string };
    documents: { count: number; label: string };
    projects: { count: number; label: string };
    newsArticles: { count: number; label: string };
    itAssets: { count: number; label: string };
    tickets: { count: number; label: string };
    roles: { count: number; label: string };
    tasks: { count: number; label: string };
    files: { count: number; label: string };
    kpi: { count: number; label: string };
    companies: { count: number; label: string };
    divisions: { count: number; label: string };
    sections: { count: number; label: string };
    total: number;
}

export const trashApi = {
    // Get counts per module
    getSummary: async (): Promise<TrashSummary> => {
        return apiGet<TrashSummary>(`${BASE_URL}/summary`);
    },

    // Get paginated list of deleted items for a specific module
    getItems: async (
        module: TrashModule,
        params?: { page?: number; limit?: number; search?: string; sortBy?: 'deletedAt' | 'name'; sortOrder?: 'asc' | 'desc' },
    ): Promise<{ data: TrashItem[]; meta: any }> => {
        return apiGet<{ data: TrashItem[]; meta: any }>(`${BASE_URL}`, { module, ...params } as any);
    },

    // Get raw item detail for audit
    getItemDetail: async (module: TrashModule, id: string): Promise<any> => {
        return apiGet<any>(`${BASE_URL}/${module}/${id}/detail`);
    },

    // Restore a single item
    restoreItem: async (module: TrashModule, id: string): Promise<{ message: string }> => {
        return apiPost<{ message: string }>(`${BASE_URL}/restore/${module}/${id}`, {});
    },

    // Restore a batch of items that were deleted together
    restoreBatch: async (batchId: string): Promise<any> => {
        return apiPost<any>(`${BASE_URL}/restore-batch/${batchId}`, {});
    },

    // Permanently delete a single item
    hardDeleteItem: async (module: TrashModule, id: string): Promise<{ message: string }> => {
        return apiDelete<{ message: string }>(`${BASE_URL}/${module}/${id}`);
    },

    // Empty trash for a module (or all if undefined)
    emptyTrash: async (module?: TrashModule): Promise<{ message: string; details: any }> => {
        const urlParams = module ? `?module=${module}` : '';
        return apiDelete<{ message: string; details: any }>(`${BASE_URL}/empty${urlParams}`);
    },
};
