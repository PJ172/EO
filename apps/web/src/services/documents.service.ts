import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";

// Types
export type DocumentType = "POLICY" | "PROCESS" | "FORM" | "OTHER";
export type DocumentStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "PUBLISHED";

export interface DocumentVersion {
    id: string;
    versionNo: number;
    content?: string;
    fileId?: string;
    effectiveDate?: string;
    createdAt: string;
}

export interface Document {
    id: string;
    title: string;
    type: DocumentType;
    category?: string;
    tags: string[];
    status: DocumentStatus;
    createdBy: string;
    currentVersionId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    versions?: DocumentVersion[];
}

export interface CreateDocumentDto {
    type: DocumentType | string;
    title: string;
    category?: string;
    tags?: string[];
    content?: string;
    fileId?: string;
}

export interface CreateDocumentVersionDto {
    content?: string;
    fileId?: string;
    effectiveDate?: string;
}

// Query Keys
export const documentKeys = {
    all: ["documents"] as const,
    lists: (params?: { isDeleted?: boolean }) => [...documentKeys.all, "list", params] as const,
    details: () => [...documentKeys.all, "detail"] as const,
    detail: (id: string) => [...documentKeys.details(), id] as const,
};

// API Functions
const fetchDocuments = async (isDeleted = false): Promise<Document[]> =>
    apiGet<Document[]>("/documents", { isDeleted });

const fetchDocument = async (id: string): Promise<Document> =>
    apiGet<Document>(`/documents/${id}`);

const createDocument = async (data: CreateDocumentDto): Promise<Document> =>
    apiPost<Document>("/documents", data);

const uploadFile = async (file: File): Promise<{ id: string; url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiPost<{ id: string; url: string }>("/files/upload", formData);
};

const deleteDocument = async (id: string): Promise<void> =>
    apiDelete(`/documents/${id}`);

const restoreDocument = async (id: string): Promise<Document> =>
    apiPost<Document>(`/documents/${id}/restore`);

const forceDeleteDocument = async (id: string): Promise<void> =>
    apiDelete(`/documents/${id}/force`);

const submitDocument = async (id: string): Promise<Document> =>
    apiPost<Document>(`/documents/${id}/submit`);

const approveDocument = async (id: string): Promise<Document> =>
    apiPost<Document>(`/documents/${id}/approve`);

const rejectDocument = async (id: string): Promise<Document> =>
    apiPost<Document>(`/documents/${id}/reject`);

// ─── Hooks ──────────────────────────────────────────────────────

export function useDocuments(isDeleted = false) {
    return useQuery({
        queryKey: documentKeys.lists({ isDeleted }),
        queryFn: () => fetchDocuments(isDeleted),
        placeholderData: (prev) => prev,
    });
}

export function useDocument(id: string) {
    return useQuery({
        queryKey: documentKeys.detail(id),
        queryFn: () => fetchDocument(id),
        enabled: !!id,
    });
}

export function useCreateDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createDocument,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.all }),
    });
}

export function useUploadFile() {
    return useMutation({ mutationFn: uploadFile });
}

export function useDeleteDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteDocument,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.all }),
    });
}

export function useRestoreDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: restoreDocument,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.all }),
    });
}

export function useForceDeleteDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: forceDeleteDocument,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.all }),
    });
}

export function useDocumentWorkflow() {
    const queryClient = useQueryClient();

    const submit = useMutation({
        mutationFn: submitDocument,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(data.id) });
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
    });

    const approve = useMutation({
        mutationFn: approveDocument,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(data.id) });
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
    });

    const reject = useMutation({
        mutationFn: rejectDocument,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(data.id) });
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
    });

    return { submit, approve, reject };
}
