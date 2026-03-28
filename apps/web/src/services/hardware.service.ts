import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Types
export interface ITAsset {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  assetType?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyEndDate?: string;
  status: string;
  condition: string;
  location?: string;
  ipAddress?: string;
  macAddress?: string;
  hostname?: string;
  specifications?: any;
  note?: string;
  assignedToId?: string;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; icon?: string };
  assignedTo?: { id: string; fullName: string; employeeCode: string };
  department?: { id: string; name: string };
  _count?: { softwareInstalls: number; maintenances: number };
}

export interface AssetCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  _count?: { assets: number };
}

export interface AssetFilters {
  search?: string;
  categoryId?: string;
  status?: string;
  assetType?: string;
  departmentId?: string;
  location?: string;
  condition?: string;
  isDeleted?: boolean;
  page?: number;
  limit?: number;
}

// Hooks
export function useHardwareAssets(filters: AssetFilters = {}) {
  return useQuery({
    queryKey: ['hardware-assets', filters],
    queryFn: () =>
      apiClient
        .get('/it-assets', {
          params: {
            ...filters,
            limit: filters.limit || 50,
            page: filters.page || 1,
          },
        })
        .then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useHardwareAsset(id: string | null) {
  return useQuery({
    queryKey: ['hardware-asset', id],
    queryFn: () => apiClient.get(`/it-assets/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useAssetCategories() {
  return useQuery({
    queryKey: ['asset-categories'],
    queryFn: () => apiClient.get('/it-assets/categories').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssetStatistics() {
  return useQuery({
    queryKey: ['asset-statistics'],
    queryFn: () => apiClient.get('/it-assets/statistics').then((r) => r.data),
    staleTime: 3 * 60 * 1000,
  });
}

export function useWarrantyAlerts(days: number = 90) {
  return useQuery({
    queryKey: ['warranty-alerts', days],
    queryFn: () =>
      apiClient.get('/it-assets/warranty-alerts', { params: { days } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['it-dashboard-stats'],
    queryFn: () => apiClient.get('/it-assets/dashboard-stats').then((r) => r.data),
    staleTime: 3 * 60 * 1000,
  });
}

// Unified: replaces useDashboardStats + useAssetStatistics + useWarrantyAlerts in one call
export function useDashboardSummary() {
  return useQuery({
    queryKey: ['it-dashboard-summary'],
    queryFn: () => apiClient.get('/it-assets/dashboard-summary').then((r) => r.data),
    staleTime: 3 * 60 * 1000,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ITAsset>) => apiClient.post('/it-assets', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hardware-assets'] });
      qc.invalidateQueries({ queryKey: ['asset-statistics'] });
    },
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ITAsset> }) =>
      apiClient.put(`/it-assets/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hardware-assets'] });
      qc.invalidateQueries({ queryKey: ['hardware-asset'] });
      qc.invalidateQueries({ queryKey: ['asset-statistics'] });
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/it-assets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hardware-assets'] });
      qc.invalidateQueries({ queryKey: ['asset-statistics'] });
    },
  });
}

export function useAssignAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { employeeId: string; note?: string } }) =>
      apiClient.post(`/it-assets/${id}/assign`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hardware-assets'] });
      qc.invalidateQueries({ queryKey: ['hardware-asset'] });
    },
  });
}

export function useReturnAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { condition?: string; note?: string } }) =>
      apiClient.post(`/it-assets/${id}/return`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hardware-assets'] });
      qc.invalidateQueries({ queryKey: ['hardware-asset'] });
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; icon?: string }) =>
      apiClient.post('/it-assets/categories', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-categories'] });
    },
  });
}
