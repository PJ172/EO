import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";

// Types
export enum ProjectStatus {
    PLANNING = "PLANNING",
    IN_PROGRESS = "IN_PROGRESS",
    ON_HOLD = "ON_HOLD",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}

export interface Project {
    id: string;
    code: string;
    name: string;
    description?: string;
    status: ProjectStatus;
    startDate: string;
    endDate?: string;
    managerId?: string;
    manager?: { id: string; fullName: string; avatar?: string };
    _count?: { tasks: number; members: number };
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

export interface CreateProjectDto {
    code: string;
    name: string;
    description?: string;
    startDate: string;
    endDate?: string;
    managerId?: string;
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {
    status?: ProjectStatus;
}

// Query Keys
export const projectKeys = {
    all: ["projects"] as const,
    lists: (params?: { isDeleted?: boolean }) => [...projectKeys.all, "list", params] as const,
    detail: (id: string) => [...projectKeys.all, "detail", id] as const,
};

// API Functions
const fetchProjects = (isDeleted = false): Promise<Project[]> =>
    apiGet<Project[]>("/projects", { isDeleted });

const fetchProject = (id: string): Promise<Project> =>
    apiGet<Project>(`/projects/${id}`);

const createProject = (data: CreateProjectDto): Promise<Project> =>
    apiPost<Project>("/projects", data);

const updateProject = ({ id, ...data }: UpdateProjectDto & { id: string }): Promise<Project> =>
    apiPatch<Project>(`/projects/${id}`, data);

const deleteProject = (id: string): Promise<{ success: boolean; batchId: string }> =>
    apiDelete(`/projects/${id}`);

const restoreProject = (id: string): Promise<Project> =>
    apiPost<Project>(`/projects/${id}/restore`);

const forceDeleteProject = (id: string): Promise<Project> =>
    apiDelete(`/projects/${id}/force`);

// ─── Hooks ──────────────────────────────────────────────────────

export function useProjects(isDeleted = false) {
    return useQuery({
        queryKey: projectKeys.lists({ isDeleted }),
        queryFn: () => fetchProjects(isDeleted),
        placeholderData: (prev) => prev,
    });
}

export function useProject(id: string) {
    return useQuery({
        queryKey: projectKeys.detail(id),
        queryFn: () => fetchProject(id),
        enabled: !!id,
    });
}

export function useCreateProject() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createProject,
        onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
    });
}

export function useUpdateProject() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: updateProject,
        onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
    });
}

export function useDeleteProject() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: deleteProject,
        onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
    });
}

export function useRestoreProject() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: restoreProject,
        onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
    });
}

export function useForceDeleteProject() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: forceDeleteProject,
        onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
    });
}
