"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    CheckCircle2, AlertCircle, AlertTriangle, Trash2,
    Clock, FileSpreadsheet, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { useImportHistory, useDeleteImportHistory, type ImportHistoryRecord } from "@/services/import-history.service";
import { PaginationControl } from "@/components/ui/pagination-control";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface ImportHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    moduleKey?: string;
    title?: string;
}

const MODULE_LABELS: Record<string, string> = {
    departments: "Đơn vị",
    factories: "Nhà máy",
    employees: "Nhân viên",
    "job-titles": "Chức vụ",
};

const STATUS_CONFIG = {
    COMPLETED: { label: "Thành công", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
    PARTIAL: { label: "Một phần", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icon: AlertTriangle },
    FAILED: { label: "Thất bại", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", icon: AlertCircle },
};

function HistoryRow({ record, onDelete }: { record: ImportHistoryRecord; onDelete: (id: string) => void }) {
    const [expanded, setExpanded] = useState(false);
    const statusConfig = STATUS_CONFIG[record.status];
    const StatusIcon = statusConfig.icon;

    return (
        <div className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-2">
            <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{record.fileName}</span>
                        <Badge className={`text-[10px] h-4 px-1.5 ${statusConfig.color}`}>
                            <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                            {statusConfig.label}
                        </Badge>
                        {record.moduleType && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{record.moduleType}</Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(record.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                        </span>
                        <span className="text-emerald-600">✓ {record.success} dòng</span>
                        {record.failed > 0 && <span className="text-red-500">✗ {record.failed} lỗi</span>}
                        {record.user && <span>{record.user.username}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {record.errors?.length > 0 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(record.id)}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {expanded && record.errors?.length > 0 && (
                <div className="ml-7 rounded bg-destructive/10 border border-destructive/20 px-3 py-2">
                    <p className="text-xs font-medium text-destructive mb-1">
                        {record.errors.length} lỗi
                        {record.errors.length >= 50 && " (hiển thị 50 đầu tiên)"}:
                    </p>
                    <ul className="text-xs text-destructive/80 space-y-0.5 list-disc pl-4">
                        {record.errors.slice(0, 50).map((err: string, i: number) => (
                            <li key={i}>{err}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export function ImportHistoryDialog({ open, onOpenChange, moduleKey, title }: ImportHistoryDialogProps) {
    const [page, setPage] = useState(1);
    const { data, isLoading } = useImportHistory(moduleKey, page, 10);
    const deleteMutation = useDeleteImportHistory();

    const handleDelete = async (id: string) => {
        try {
            await deleteMutation.mutateAsync(id);
            toast.success("Đã xóa bản ghi");
        } catch {
            toast.error("Không thể xóa bản ghi");
        }
    };

    const moduleLabel = moduleKey ? MODULE_LABELS[moduleKey] ?? moduleKey : "Tất cả";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Lịch sử Import — {title ?? moduleLabel}
                        {data?.meta.total !== undefined && (
                            <Badge variant="secondary" className="text-xs">{data.meta.total} lần</Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="h-[420px] pr-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Đang tải...
                        </div>
                    ) : data?.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <FileSpreadsheet className="h-10 w-10 mb-3 opacity-30" />
                            <p className="text-sm">Chưa có lịch sử import</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data?.data.map((record) => (
                                <HistoryRow key={record.id} record={record} onDelete={handleDelete} />
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {data && data.meta.totalPages > 1 && (
                    <>
                        <Separator />
                        <PaginationControl
                            currentPage={page}
                            totalPages={data.meta.totalPages}
                            pageSize={10}
                            totalCount={data.meta.total}
                            onPageChange={setPage}
                            onPageSizeChange={() => { }}
                        />
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
