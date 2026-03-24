"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { newsApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Eye, Save, Image as ImageIcon } from "lucide-react";

interface ArticleEditorProps {
    initialData?: {
        title?: string;
        summary?: string;
        content?: string;
        thumbnail?: string;
        categoryId?: string;
        isPublished?: boolean;
    };
    onSave: (data: any) => void;
    isSaving?: boolean;
    mode?: "create" | "edit";
}

export function ArticleEditor({ initialData, onSave, isSaving, mode = "create" }: ArticleEditorProps) {
    const [formData, setFormData] = useState({
        title: initialData?.title || "",
        summary: initialData?.summary || "",
        content: initialData?.content || "",
        thumbnail: initialData?.thumbnail || "",
        categoryId: initialData?.categoryId || "",
        isPublished: initialData?.isPublished || false,
    });

    const { data: categories } = useQuery({
        queryKey: ["news-categories"],
        queryFn: newsApi.getCategories,
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || "",
                summary: initialData.summary || "",
                content: initialData.content || "",
                thumbnail: initialData.thumbnail || "",
                categoryId: initialData.categoryId || "",
                isPublished: initialData.isPublished || false,
            });
        }
    }, [initialData]);

    const handleSubmit = () => {
        if (!formData.title.trim()) {
            return;
        }
        onSave({
            ...formData,
            categoryId: formData.categoryId || undefined,
        });
    };

    return (
        <div className="space-y-6">
            <Tabs defaultValue="edit" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="edit">Soạn thảo</TabsTrigger>
                        <TabsTrigger value="preview">
                            <Eye className="mr-2 h-4 w-4" />
                            Xem trước
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.isPublished}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, isPublished: checked })
                                }
                            />
                            <Label className="text-sm">
                                {formData.isPublished ? "Xuất bản ngay" : "Lưu nháp"}
                            </Label>
                        </div>
                        <Button onClick={handleSubmit} disabled={isSaving || !formData.title.trim()}>
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {mode === "create" ? "Tạo tin" : "Lưu thay đổi"}
                        </Button>
                    </div>
                </div>

                <TabsContent value="edit" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        {/* Main content - 2 columns */}
                        <div className="col-span-2 space-y-4">
                            <div className="space-y-2">
                                <Label>Tiêu đề *</Label>
                                <Input
                                    placeholder="Nhập tiêu đề tin tức..."
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="text-lg font-semibold"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Tóm tắt</Label>
                                <Textarea
                                    placeholder="Mô tả ngắn gọn nội dung tin..."
                                    value={formData.summary}
                                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                    rows={2}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Nội dung *</Label>
                                <Textarea
                                    placeholder="Nhập nội dung chi tiết..."
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    rows={12}
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Hỗ trợ Markdown: **bold**, *italic*, # Heading, - List
                                </p>
                            </div>
                        </div>

                        {/* Sidebar - 1 column */}
                        <div className="space-y-4">
                            <Card>
                                <CardContent className="p-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label>Danh mục</Label>
                                        <Select
                                            value={formData.categoryId}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, categoryId: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Chọn danh mục" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories?.map((cat: any) => (
                                                    <SelectItem key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Thumbnail URL</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="https://..."
                                                value={formData.thumbnail}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, thumbnail: e.target.value })
                                                }
                                            />
                                        </div>
                                        {formData.thumbnail && (
                                            <div className="mt-2 rounded-lg overflow-hidden border">
                                                <img
                                                    src={formData.thumbnail}
                                                    alt="Preview"
                                                    className="w-full h-32 object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = "none";
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {!formData.thumbnail && (
                                            <div className="mt-2 rounded-lg border border-dashed p-6 flex flex-col items-center justify-center text-muted-foreground">
                                                <ImageIcon className="h-8 w-8 mb-2" />
                                                <span className="text-xs">Chưa có ảnh</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="preview">
                    <Card>
                        <CardContent className="p-6">
                            {formData.thumbnail && (
                                <img
                                    src={formData.thumbnail}
                                    alt={formData.title}
                                    className="w-full h-64 object-cover rounded-lg mb-6"
                                />
                            )}
                            <h1 className="text-3xl font-bold mb-4">{formData.title || "Chưa có tiêu đề"}</h1>
                            {formData.summary && (
                                <p className="text-lg text-muted-foreground mb-6">{formData.summary}</p>
                            )}
                            <div className="prose prose-invert max-w-none whitespace-pre-wrap">
                                {formData.content || "Chưa có nội dung"}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
