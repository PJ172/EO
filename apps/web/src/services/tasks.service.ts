import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";

// Types
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    deadline?: string;
    assignorId: string;
    assigneeId?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    _count?: { comments: number };
}

export interface CreateTaskDto {
    title: string;
    description?: string;
    assigneeId?: string;
    deadline?: string;
    priority?: TaskPriority;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
    status?: TaskStatus;
}

// Query Keys
export const taskKeys = {
    all: ["tasks"] as const,
    mine: () => [...taskKeys.all, "mine"] as const,
    detail: (id: string) => [...taskKeys.all, "detail", id] as const,
    trash: () => [...taskKeys.all, "trash"] as const,
};

// API Functions
const fetchMyTasks = (isDeleted = false): Promise<Task[]> => apiGet<Task[]>("/tasks", { isDeleted });
const fetchTask = (id: string): Promise<Task> => apiGet<Task>(`/tasks/${id}`);
const createTask = (data: CreateTaskDto): Promise<Task> => apiPost<Task>("/tasks", data);
const updateTask = ({ id, ...data }: UpdateTaskDto & { id: string }): Promise<Task> =>
    apiPut<Task>(`/tasks/${id}`, data);
const deleteTask = (id: string): Promise<void> => apiDelete(`/tasks/${id}`);
const restoreTask = (id: string): Promise<Task> => apiPost<Task>(`/tasks/${id}/restore`);
const forceDeleteTask = (id: string): Promise<void> => apiDelete(`/tasks/${id}/force`);

// ─── Hooks ──────────────────────────────────────────────────────

export function useMyTasks(isDeleted = false) {
    return useQuery({
        queryKey: [...taskKeys.mine(), isDeleted],
        queryFn: () => fetchMyTasks(isDeleted),
    });
}

export function useTask(id: string) {
    return useQuery({
        queryKey: taskKeys.detail(id),
        queryFn: () => fetchTask(id),
        enabled: !!id,
    });
}

export function useCreateTask() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createTask,
        onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
    });
}

export function useUpdateTask() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: updateTask,
        onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
    });
}

export function useDeleteTask() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: deleteTask,
        onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
    });
}

export function useRestoreTask() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: restoreTask,
        onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
    });
}

export function useForceDeleteTask() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: forceDeleteTask,
        onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
    });
}
