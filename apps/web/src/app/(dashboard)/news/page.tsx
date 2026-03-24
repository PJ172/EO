"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { newsApi } from "@/lib/api-client";
import { useNewsArticles, useCreateNewsArticle, useDeleteNewsArticle, usePublishNewsArticle, useUnpublishNewsArticle } from "@/services/news.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { SearchBar } from "@/components/ui/search-bar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import {
    Plus, Newspaper, Loader2, Eye, EyeOff, Search, LayoutGrid, List, FileDown, Upload, ArrowUpDown, ChevronUp, ChevronDown
} from "lucide-react";
import { ArticleCard } from "@/components/news/ArticleCard";
import { CategoryManager } from "@/components/news/CategoryManager";
import { ArticleEditor } from "@/components/news/ArticleEditor";

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "published" | "draft";

export default function NewsPage() {
    const queryClient = useQueryClient();
    const [isNewOpen, setIsNewOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [sort, setSort] = useState<{ sortBy: string, order: "asc" | "desc" }>({ sortBy: "createdAt", order: "desc" });

    const handleExport = () => toast.info("Tính năng Xuất Excel đang được phát triển...");
    const handleImport = () => toast.info("Tính năng Nhập Excel đang được phát triển...");

    const toggleSort = (field: string) => {
        setSort(prev => ({
            sortBy: field,
            order: prev.sortBy === field && prev.order === "asc" ? "desc" : "asc"
        }));
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sort.sortBy !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50 text-muted-foreground group-hover:opacity-100 transition-opacity" />;
        return sort.order === "asc" ? <ChevronUp className="ml-2 h-4 w-4 text-primary" /> : <ChevronDown className="ml-2 h-4 w-4 text-primary" />;
    };

    const { data: articles, isLoading } = useNewsArticles(false);

    const createMutation = useCreateNewsArticle();
    const publishMutation = usePublishNewsArticle();
    const unpublishMutation = useUnpublishNewsArticle();
    const deleteMutation = useDeleteNewsArticle();

    // Filter articles
    const filteredArticles = articles?.filter((article: any) => {
        // Category filter
        if (selectedCategory && article.categoryId !== selectedCategory) return false;

        // Status filter
        if (statusFilter === "published" && !article.isPublished) return false;
        if (statusFilter === "draft" && article.isPublished) return false;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                article.title.toLowerCase().includes(query) ||
                article.summary?.toLowerCase().includes(query)
            );
        }

        return true;
    });

    const activeArticles = articles?.filter((a: any) => !a.deletedAt) || [];

    const stats = {
        total: activeArticles.length,
        published: activeArticles.filter((a: any) => a.isPublished).length,
        draft: activeArticles.filter((a: any) => !a.isPublished).length,
    };

    return (
        <div className="flex gap-6 h-[calc(100vh-0rem)] p-2 bg-background custom-scrollbar">
            {/* Sidebar */}
            <div className="w-64 shrink-0">
                <Card className="h-full">
                    <CardContent className="p-4">
                        <CategoryManager
                            selectedCategory={selectedCategory}
                            onSelectCategory={setSelectedCategory}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <div className="flex-1 space-y-4 overflow-auto">
                {/* Header */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <PageHeader
                    title="Tin tức"
                    icon={
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-sky-500 to-sky-700">
                            <Newspaper className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                        </div>
                    }
                    className="mb-0 border-none bg-transparent p-0 shadow-none"
                    search={
                        <SearchBar
                            placeholder="Tìm kiếm tin tức..."
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        />
                    }
                >
                    <Button variant="outline" onClick={handleExport} className="h-10">
                        <FileDown className="mr-2 h-4 w-4" /> Xuất Excel
                    </Button>
                    <Button variant="outline" onClick={handleImport} className="h-10">
                        <Upload className="mr-2 h-4 w-4" /> Nhập Excel
                    </Button>
                    <Button onClick={() => setIsNewOpen(true)} className="h-10 shadow-md">
                        <Plus className="mr-2 h-4 w-4" />
                        Thêm mới
                    </Button>
                </PageHeader>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tổng tin</CardTitle>
                            <Newspaper className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Đã xuất bản</CardTitle>
                            <Eye className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">{stats.published}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-gray-500/10 to-gray-600/5 border-gray-500/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Bản nháp</CardTitle>
                            <EyeOff className="h-4 w-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-500">{stats.draft}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}

                <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                    <TabsList>
                        <TabsTrigger value="all">
                            Tất cả
                            <Badge variant="secondary" className="ml-2">{stats.total}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="published">
                            Xuất bản
                            <Badge variant="secondary" className="ml-2 bg-green-500/20 text-green-500">
                                {stats.published}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="draft">
                            Nháp
                            <Badge variant="secondary" className="ml-2">{stats.draft}</Badge>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-1 ml-auto">
                    <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setViewMode("grid")}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setViewMode("list")}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Articles Grid */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredArticles?.length === 0 ? (
                <Card className="py-12">
                    <CardContent className="text-center text-muted-foreground">
                        <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Chưa có tin nào.</p>
                        <Button variant="link" onClick={() => setIsNewOpen(true)}>
                            Tạo tin đầu tiên
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div
                    className={
                        viewMode === "grid"
                            ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                            : "space-y-4"
                    }
                >
                    {filteredArticles?.map((article: any) => (
                        <ArticleCard
                            key={article.id}
                            article={article}
                            isDeleted={false}
                            onPublish={(id) => publishMutation.mutate(id)}
                            onUnpublish={(id) => unpublishMutation.mutate(id)}
                            onDelete={(id) => deleteMutation.mutate(id)}
                        />
                    ))}
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Tạo tin mới</DialogTitle>
                    </DialogHeader>
                    <ArticleEditor
                        mode="create"
                        onSave={(data) => createMutation.mutate(data)}
                        isSaving={createMutation.isPending}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
