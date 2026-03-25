"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { newsApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import {
    ArrowLeft, Eye, EyeOff, Trash2, Loader2, Calendar, Tag
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArticleEditor } from "@/components/news/ArticleEditor";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function ArticleDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data: article, isLoading } = useQuery({
        queryKey: ["news-article", id],
        queryFn: () => newsApi.getArticle(id),
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => newsApi.updateArticle(id, data),
        onSuccess: () => {
            toast.success("Đã lưu thay đổi!");
            queryClient.invalidateQueries({ queryKey: ["news-article", id] });
            queryClient.invalidateQueries({ queryKey: ["news-articles"] });
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Lỗi cập nhật"),
    });

    const publishMutation = useMutation({
        mutationFn: () => newsApi.publish(id),
        onSuccess: () => {
            toast.success("Đã xuất bản!");
            queryClient.invalidateQueries({ queryKey: ["news-article", id] });
            queryClient.invalidateQueries({ queryKey: ["news-articles"] });
        },
    });

    const unpublishMutation = useMutation({
        mutationFn: () => newsApi.unpublish(id),
        onSuccess: () => {
            toast.success("Đã gỡ xuất bản");
            queryClient.invalidateQueries({ queryKey: ["news-article", id] });
            queryClient.invalidateQueries({ queryKey: ["news-articles"] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => newsApi.deleteArticle(id),
        onSuccess: () => {
            toast.success("Đã xóa tin");
            queryClient.invalidateQueries({ queryKey: ["news-articles"] });
            router.push("/news");
        },
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!article) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Không tìm thấy bài viết</p>
                <Button variant="link" onClick={() => router.push("/news")}>
                    Quay lại danh sách
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/news")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold">Chỉnh sửa tin</h2>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(article.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                            </span>
                            {article.category && (
                                <span className="flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    {article.category.name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {article.isPublished ? (
                        <>
                            <Badge className="bg-green-500/90 text-white">
                                <Eye className="mr-1 h-3 w-3" />
                                Đã xuất bản
                            </Badge>
                            <Button
                                variant="outline"
                                onClick={() => unpublishMutation.mutate()}
                                disabled={unpublishMutation.isPending}
                            >
                                <EyeOff className="mr-2 h-4 w-4" />
                                Gỡ xuất bản
                            </Button>
                        </>
                    ) : (
                        <>
                            <Badge variant="secondary">
                                <EyeOff className="mr-1 h-3 w-3" />
                                Bản nháp
                            </Badge>
                            <Button
                                variant="default"
                                onClick={() => publishMutation.mutate()}
                                disabled={publishMutation.isPending}
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                Xuất bản
                            </Button>
                        </>
                    )}

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Bạn có chắc muốn xóa tin "{article.title}"? Hành động này không thể hoàn tác.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => deleteMutation.mutate()}
                                    className="bg-red-500 hover:bg-red-600"
                                >
                                    Xóa
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* Editor */}
            <Card>
                <CardContent className="p-6">
                    <ArticleEditor
                        mode="edit"
                        initialData={{
                            title: article.title,
                            summary: article.summary,
                            content: article.content,
                            thumbnail: article.thumbnail,
                            categoryId: article.categoryId,
                            isPublished: article.isPublished,
                        }}
                        onSave={(data) => updateMutation.mutate(data)}
                        isSaving={updateMutation.isPending}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
