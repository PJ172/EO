"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, EyeOff, MoreVertical, Trash2, Edit, Calendar, Tag, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

interface ArticleCardProps {
    article: {
        id: string;
        title: string;
        summary?: string;
        thumbnail?: string;
        isPublished: boolean;
        publishedAt?: string;
        createdAt: string;
        category?: { id: string; name: string };
    };
    isDeleted?: boolean;
    onPublish: (id: string) => void;
    onUnpublish: (id: string) => void;
    onDelete: (id: string) => void;
    onRestore?: (id: string) => void;
    onForceDelete?: (id: string) => void;
}

export function ArticleCard({ article, isDeleted, onPublish, onUnpublish, onDelete, onRestore, onForceDelete }: ArticleCardProps) {
    return (
        <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-card/80 border-border/50">
            {/* Thumbnail */}
            <div className="relative h-40 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
                {article.thumbnail ? (
                    <img
                        src={article.thumbnail}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-6xl opacity-20">📰</div>
                    </div>
                )}

                <div className="absolute top-3 left-3">
                    {isDeleted ? (
                        <Badge variant="destructive" className="bg-rose-500/90 text-white shadow-sm">
                            <Trash2 className="mr-1 h-3 w-3" />
                            Đã xóa
                        </Badge>
                    ) : article.isPublished ? (
                        <Badge className="bg-green-500/90 text-white shadow-sm">
                            <Eye className="mr-1 h-3 w-3" />
                            Đã xuất bản
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="bg-gray-800/80 text-gray-200 shadow-sm">
                            <EyeOff className="mr-1 h-3 w-3" />
                            Bản nháp
                        </Badge>
                    )}
                </div>

                {/* Actions Menu */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8 bg-black/50 hover:bg-black/70">
                                <MoreVertical className="h-4 w-4 text-white" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {isDeleted ? (
                                <>
                                    <DropdownMenuItem onClick={() => onRestore?.(article.id)} className="text-emerald-600 focus:text-emerald-600">
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Khôi phục
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onForceDelete?.(article.id)} className="text-red-500 focus:text-red-500">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Xóa vĩnh viễn
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <>
                                    <DropdownMenuItem asChild>
                                        <Link href={`/news/${article.id}`}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Chỉnh sửa
                                        </Link>
                                    </DropdownMenuItem>
                                    {article.isPublished ? (
                                        <DropdownMenuItem onClick={() => onUnpublish(article.id)}>
                                            <EyeOff className="mr-2 h-4 w-4" />
                                            Gỡ xuất bản
                                        </DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem onClick={() => onPublish(article.id)}>
                                            <Eye className="mr-2 h-4 w-4 text-green-500" />
                                            Xuất bản
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                        onClick={() => onDelete(article.id)}
                                        className="text-red-500 focus:text-red-500"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Xóa (vào thùng rác)
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Content */}
            <CardContent className="p-4 space-y-3">
                {/* Category */}
                {article.category && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                        <Tag className="h-3 w-3" />
                        <span>{article.category.name}</span>
                    </div>
                )}

                {/* Title */}
                <Link href={`/news/${article.id}`}>
                    <h3 className="font-semibold text-lg line-clamp-2 hover:text-primary transition-colors cursor-pointer">
                        {article.title}
                    </h3>
                </Link>

                {/* Summary */}
                {article.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {article.summary}
                    </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                            {format(new Date(article.createdAt), "dd/MM/yyyy", { locale: vi })}
                        </span>
                    </div>
                    {article.publishedAt && (
                        <span className="text-xs text-green-500">
                            Xuất bản: {format(new Date(article.publishedAt), "dd/MM/yyyy", { locale: vi })}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
