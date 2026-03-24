"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { newsApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { Plus, Tag, Trash2, Loader2, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryManagerProps {
    selectedCategory: string | null;
    onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryManager({ selectedCategory, onSelectCategory }: CategoryManagerProps) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [newName, setNewName] = useState("");

    const { data: categories, isLoading } = useQuery({
        queryKey: ["news-categories"],
        queryFn: newsApi.getCategories,
    });

    const createMutation = useMutation({
        mutationFn: newsApi.createCategory,
        onSuccess: () => {
            toast.success("Tạo danh mục thành công!");
            queryClient.invalidateQueries({ queryKey: ["news-categories"] });
            setIsOpen(false);
            setNewName("");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Lỗi tạo danh mục"),
    });

    const deleteMutation = useMutation({
        mutationFn: newsApi.deleteCategory,
        onSuccess: () => {
            toast.success("Đã xóa danh mục");
            queryClient.invalidateQueries({ queryKey: ["news-categories"] });
            if (selectedCategory) onSelectCategory(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Không thể xóa"),
    });

    const handleCreate = () => {
        if (!newName.trim()) {
            toast.error("Vui lòng nhập tên danh mục");
            return;
        }
        createMutation.mutate({ name: newName.trim() });
    };

    const totalArticles = categories?.reduce((sum: number, c: any) => sum + (c._count?.articles || 0), 0) || 0;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Danh mục
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-1">
                    {/* All */}
                    <button
                        onClick={() => onSelectCategory(null)}
                        className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                            selectedCategory === null
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            Tất cả
                        </span>
                        <Badge variant="secondary" className="text-xs">
                            {totalArticles}
                        </Badge>
                    </button>

                    {/* Categories */}
                    {categories?.map((category: any) => (
                        <div
                            key={category.id}
                            className={cn(
                                "group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                                selectedCategory === category.id
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted"
                            )}
                        >
                            <button
                                onClick={() => onSelectCategory(category.id)}
                                className="flex items-center gap-2 flex-1 text-left"
                            >
                                <Tag className="h-4 w-4" />
                                {category.name}
                            </button>
                            <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-xs">
                                    {category._count?.articles || 0}
                                </Badge>
                                {category._count?.articles === 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteMutation.mutate(category.id);
                                        }}
                                    >
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Tạo danh mục mới</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Tên danh mục..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleCreate} disabled={createMutation.isPending}>
                            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Tạo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
