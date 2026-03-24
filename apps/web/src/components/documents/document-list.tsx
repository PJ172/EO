'use client';

import { useDocuments } from '@/services/documents.service';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { FileText, Download, ArrowUpDown, ChevronUp, ChevronDown, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useRestoreDocument, useForceDeleteDocument } from '@/services/documents.service';
import { toast } from 'sonner';

export function DocumentList({ search = "", isDeletedView = false }: { search?: string, isDeletedView?: boolean }) {
    const { data: allDocuments, isLoading, error } = useDocuments(isDeletedView);
    const restoreMutation = useRestoreDocument();
    const forceDeleteMutation = useForceDeleteDocument();
    const [sort, setSort] = useState<{ sortBy: string, order: "asc" | "desc" }>({ sortBy: "createdAt", order: "desc" });

    const toggleSort = (field: string) => {
        setSort(prev => ({
            sortBy: field,
            order: prev.sortBy === field && prev.order === "asc" ? "desc" : "asc"
        }));
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sort.sortBy !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:bg-muted/50 rounded" />;
        return sort.order === "asc"
            ? <ChevronUp className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />
            : <ChevronDown className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />;
    };

    const handleRestore = async (id: string) => {
        if (!confirm('Bạn có chắc muốn khôi phục tài liệu này?')) return;
        try {
            await restoreMutation.mutateAsync(id);
            toast.success('Khôi phục tài liệu thành công');
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Lỗi khi khôi phục');
        }
    };

    const handleForceDelete = async (id: string) => {
        if (!confirm('CẢNH BÁO: Hành động này không thể hoàn tác.\nBạn có chắc muốn xóa VĨNH VIỄN tài liệu này?')) return;
        try {
            await forceDeleteMutation.mutateAsync(id);
            toast.success('Xóa vĩnh viễn thành công');
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Lỗi khi xóa vĩnh viễn');
        }
    };

    if (isLoading) return <div className="p-8 text-center">Đang tải tài liệu...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Lỗi tải tài liệu</div>;

    const documents = allDocuments?.filter((doc: any) =>
        doc.title.toLowerCase().includes(search.toLowerCase()) ||
        doc.type.toLowerCase().includes(search.toLowerCase())
    ).sort((a: any, b: any) => {
        const aVal = a[sort.sortBy];
        const bVal = b[sort.sortBy];
        if (sort.order === "asc") return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
    });

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("title")}>
                            <div className="flex items-center">
                                Tiêu đề <SortIcon field="title" />
                            </div>
                        </TableHead>
                        <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("type")}>
                            <div className="flex items-center">
                                Loại <SortIcon field="type" />
                            </div>
                        </TableHead>
                        <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("status")}>
                            <div className="flex items-center">
                                Trạng thái <SortIcon field="status" />
                            </div>
                        </TableHead>
                        <TableHead className="h-10 font-medium">Phiên bản</TableHead>
                        <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("createdAt")}>
                            <div className="flex items-center">
                                Ngày tạo <SortIcon field="createdAt" />
                            </div>
                        </TableHead>
                        <TableHead className="h-10 font-medium text-right">Thao tác</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents?.map((doc) => (
                        <TableRow key={doc.id}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-500" />
                                    {doc.title}
                                </div>
                            </TableCell>
                            <TableCell>{doc.type}</TableCell>
                            <TableCell>{doc.status}</TableCell>
                            <TableCell>
                                {doc.versions?.[0]?.versionNo ? `v${doc.versions[0].versionNo}` : '-'}
                            </TableCell>
                            <TableCell>{format(new Date(doc.createdAt), 'dd/MM/yyyy', { locale: vi })}</TableCell>
                            <TableCell className="text-right">
                                {isDeletedView ? (
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleRestore(doc.id)} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                            <RotateCcw className="h-4 w-4 mr-1" /> Khôi phục
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleForceDelete(doc.id)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                                            <Trash2 className="h-4 w-4 mr-1" /> Xóa vĩnh viễn
                                        </Button>
                                    </div>
                                ) : (
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/documents/${doc.id}`}>Xem</Link>
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                    {documents?.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                Không tìm thấy tài liệu nào.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
