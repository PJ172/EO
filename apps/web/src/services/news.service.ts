import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";

// Types
export interface NewsCategory {
    id: string;
    name: string;
    slug: string;
    description?: string;
    color?: string;
    icon?: string;
}

export interface NewsArticle {
    id: string;
    title: string;
    summary?: string;
    content?: string;
    coverImage?: string;
    isPublished: boolean;
    publishedAt?: string;
    categoryId?: string;
    category?: NewsCategory;
    authorId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

export interface CreateNewsArticleDto {
    title: string;
    summary?: string;
    content?: string;
    coverImage?: string;
    categoryId?: string;
}

export interface UpdateNewsArticleDto extends Partial<CreateNewsArticleDto> { }

// Query Keys
export const newsKeys = {
    all: ["news-articles"] as const,
    lists: (params?: { isDeleted?: boolean }) => [...newsKeys.all, "list", params] as const,
    detail: (id: string) => [...newsKeys.all, "detail", id] as const,
    categories: ["news-categories"] as const,
};

// API Functions
const fetchArticles = (isDeleted = false): Promise<NewsArticle[]> =>
    apiGet<NewsArticle[]>("/news/articles", { isDeleted });

const fetchArticle = (id: string): Promise<NewsArticle> =>
    apiGet<NewsArticle>(`/news/articles/${id}`);

const createArticle = (data: CreateNewsArticleDto): Promise<NewsArticle> =>
    apiPost<NewsArticle>("/news/articles", data);

const updateArticle = ({ id, ...data }: UpdateNewsArticleDto & { id: string }): Promise<NewsArticle> =>
    apiPost<NewsArticle>(`/news/articles/${id}`, data);

const deleteArticle = (id: string): Promise<void> =>
    apiDelete(`/news/articles/${id}`);

const restoreArticle = (id: string): Promise<NewsArticle> =>
    apiPost<NewsArticle>(`/news/articles/${id}/restore`);

const forceDeleteArticle = (id: string): Promise<void> =>
    apiDelete(`/news/articles/${id}/force`);

const publishArticle = (id: string): Promise<NewsArticle> =>
    apiPost<NewsArticle>(`/news/articles/${id}/publish`);

const unpublishArticle = (id: string): Promise<NewsArticle> =>
    apiPost<NewsArticle>(`/news/articles/${id}/unpublish`);

const fetchCategories = (): Promise<NewsCategory[]> =>
    apiGet<NewsCategory[]>("/news/categories");

// ─── Hooks ──────────────────────────────────────────────────────

export function useNewsArticles(isDeleted = false) {
    return useQuery({
        queryKey: newsKeys.lists({ isDeleted }),
        queryFn: () => fetchArticles(isDeleted),
        placeholderData: (prev) => prev,
    });
}

export function useNewsArticle(id: string) {
    return useQuery({
        queryKey: newsKeys.detail(id),
        queryFn: () => fetchArticle(id),
        enabled: !!id,
    });
}

export function useNewsCategories() {
    return useQuery({
        queryKey: newsKeys.categories,
        queryFn: fetchCategories,
    });
}

export function useCreateNewsArticle() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createArticle,
        onSuccess: () => qc.invalidateQueries({ queryKey: newsKeys.all }),
    });
}

export function useDeleteNewsArticle() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: deleteArticle,
        onSuccess: () => qc.invalidateQueries({ queryKey: newsKeys.all }),
    });
}

export function useRestoreNewsArticle() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: restoreArticle,
        onSuccess: () => qc.invalidateQueries({ queryKey: newsKeys.all }),
    });
}

export function useForceDeleteNewsArticle() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: forceDeleteArticle,
        onSuccess: () => qc.invalidateQueries({ queryKey: newsKeys.all }),
    });
}

export function usePublishNewsArticle() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: publishArticle,
        onSuccess: () => qc.invalidateQueries({ queryKey: newsKeys.all }),
    });
}

export function useUnpublishNewsArticle() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: unpublishArticle,
        onSuccess: () => qc.invalidateQueries({ queryKey: newsKeys.all }),
    });
}
