import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Types
export interface Software {
  id: string;
  name: string;
  vendor?: string;
  version?: string;
  licenseType: string;
  licenseKey?: string;
  maxInstalls?: number;
  purchaseDate?: string;
  expiryDate?: string;
  cost?: number;
  note?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  activeInstalls?: number;
  totalInstalls?: number;
  _count?: { installations: number };
}

export interface SoftwareInstallation {
  id: string;
  softwareId: string;
  assetId: string;
  installedDate: string;
  removedDate?: string;
  installedBy?: string;
  isAuthorized: boolean;
  detectedBy?: string;
  version?: string;
  note?: string;
  software?: { name: string; vendor?: string; version?: string; licenseType: string };
  asset?: {
    id: string;
    code: string;
    name: string;
    assetType?: string;
    hostname?: string;
    assignedTo?: { id: string; fullName: string };
    department?: { id: string; name: string };
  };
}

export interface SoftwareFilters {
  search?: string;
  licenseType?: string;
  status?: string;
  vendor?: string;
  page?: number;
  limit?: number;
}

export interface ComplianceReport {
  overLicensed: { id: string; name: string; maxInstalls: number; currentInstalls: number; overBy: number }[];
  nearLimit: { id: string; name: string; maxInstalls: number; currentInstalls: number; remaining: number }[];
  expired: { id: string; name: string; expiryDate: string }[];
}

// Hooks — Software CRUD
export function useSoftwareList(filters: SoftwareFilters = {}) {
  return useQuery({
    queryKey: ['software-list', filters],
    queryFn: () =>
      apiClient.get('/software', { params: { ...filters, limit: filters.limit || 50, page: filters.page || 1 } })
        .then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSoftwareDetail(id: string | null) {
  return useQuery({
    queryKey: ['software-detail', id],
    queryFn: () => apiClient.get(`/software/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useSoftwareStats() {
  return useQuery({
    queryKey: ['software-stats'],
    queryFn: () => apiClient.get('/software/statistics').then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSoftwareCompliance() {
  return useQuery({
    queryKey: ['software-compliance'],
    queryFn: () => apiClient.get('/software/compliance').then((r) => r.data) as Promise<ComplianceReport>,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSoftware() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Software>) => apiClient.post('/software', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['software-list'] });
      qc.invalidateQueries({ queryKey: ['software-stats'] });
    },
  });
}

export function useUpdateSoftware() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Software> }) =>
      apiClient.put(`/software/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['software-list'] });
      qc.invalidateQueries({ queryKey: ['software-detail'] });
      qc.invalidateQueries({ queryKey: ['software-stats'] });
    },
  });
}

export function useDeleteSoftware() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/software/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['software-list'] });
      qc.invalidateQueries({ queryKey: ['software-stats'] });
    },
  });
}

// Hooks — Installation
export function useInstallSoftware() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { softwareId: string; assetId: string; version?: string; installedBy?: string; isAuthorized?: boolean; note?: string }) =>
      apiClient.post('/software/install', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['software-list'] });
      qc.invalidateQueries({ queryKey: ['software-detail'] });
      qc.invalidateQueries({ queryKey: ['software-stats'] });
      qc.invalidateQueries({ queryKey: ['software-compliance'] });
      qc.invalidateQueries({ queryKey: ['hardware-asset'] }); // Refresh asset detail too
    },
  });
}

export function useUninstallSoftware() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ installationId, note }: { installationId: string; note?: string }) =>
      apiClient.post(`/software/installations/${installationId}/uninstall`, { note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['software-list'] });
      qc.invalidateQueries({ queryKey: ['software-detail'] });
      qc.invalidateQueries({ queryKey: ['software-stats'] });
      qc.invalidateQueries({ queryKey: ['software-compliance'] });
    },
  });
}

export function useToggleAuthorized() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (installationId: string) =>
      apiClient.post(`/software/installations/${installationId}/toggle-authorized`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['software-detail'] });
      qc.invalidateQueries({ queryKey: ['software-stats'] });
    },
  });
}
