"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PaginationControl } from "@/components/ui/pagination-control";
import { SearchBar } from "@/components/ui/search-bar";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";
import { PermissionGate } from "@/components/auth/permission-gate";
import { useTableColumns, ColumnDef } from "@/hooks/use-table-columns";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    Plus, MoreHorizontal, FileDown, Upload, Trash2,
    ArrowUpDown, ChevronUp, ChevronDown, Columns3,
    LucideIcon, CheckCircle2, XCircle, Users, Building2, RefreshCcw,
    Settings2, Save, X, Loader2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// ──────────────────────────────────── Types ────────────────────────────────────

export interface OrgColumnDef<T> {
    key: string;
    label: string;
    sortable?: boolean;
    className?: string;
    render: (item: T) => React.ReactNode;
}

export interface AuditInfo {
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
}

export interface OrgModuleConfig<T> {
    title: string;
    icon: LucideIcon;
    solidBg?: string;           // full gradient class for icon bg
    accentBorderClass: string;  // full tailwind border class: "border-l-blue-500"
    accentBgClass: string;      // icon bg: "bg-blue-500/10"
    accentTextClass: string;    // icon text: "text-blue-600 dark:text-blue-400"
    titleGradient?: string;     // gradient for title text
    permissionPrefix: string;
    moduleKey?: string;         // key for column config persistence
    columns: OrgColumnDef<T>[];
    getId: (item: T) => string;
    getName: (item: T) => string;
    getStatus?: (item: T) => "ACTIVE" | "INACTIVE";
    getEmployeeCount?: (item: T) => number;
    getAuditInfo?: (item: T) => AuditInfo;
    clickableKeys?: string[];   // column keys that open edit dialog on click
    singularLabel: string;
    searchPlaceholder: string;
    backHref?: string;
}

interface OrgModulePageProps<T> {
    config: OrgModuleConfig<T>;
    data: T[];
    meta?: { total: number; page: number; limit: number; totalPages: number; active?: number; inactive?: number };
    isLoading: boolean;
    refetch: () => void;
    page: number;
    onPageChange: (p: number) => void;
    pageSize: number;
    onPageSizeChange: (s: number) => void;
    search: string;
    onSearchChange: (v: string) => void;
    sortKey: string | null;
    sortDir: "asc" | "desc" | null;
    onSort: (key: string) => void;
    onDelete: (id: string) => Promise<{ success?: boolean; batchId?: string } | void>;
    onBulkDelete?: (ids: string[]) => Promise<void>;
    onRefreshWithReset?: () => void;
    onExport?: () => void;
    isExporting?: boolean;
    onImport?: () => void;
    isImporting?: boolean;
    onCreateClick: () => void;
    onEditClick: (item: T) => void;
    dialogs?: React.ReactNode;
    // Org Chart Bulk Toggle
    onBulkToggleOrgChart?: (show: boolean) => Promise<void>;
    isTogglingOrgChart?: boolean;
    // New props for Trash Module
    isDeletedView?: boolean;
    tabs?: React.ReactNode;
    onRestore?: (id: string) => Promise<void>;
    onHardDelete?: (id: string) => Promise<void>;
    // Generic toggle for Org Chart (used for Quick Save)
    onToggleOrgChart?: (id: string, checked: boolean) => Promise<void>;
}

// ──────────────────────────────── Main Component ──────────────────────────────

export function OrgModulePage<T>({
    config,
    data,
    meta,
    isLoading,
    refetch,
    page,
    onPageChange,
    pageSize,
    onPageSizeChange,
    search,
    onSearchChange,
    sortKey,
    sortDir,
    onSort,
    onDelete,
    onBulkDelete,
    onRefreshWithReset,
    onExport,
    isExporting,
    onImport,
    isImporting,
    onCreateClick,
    onEditClick,
    dialogs,
    onBulkToggleOrgChart,
    isTogglingOrgChart = false,
    onToggleOrgChart,
    // Trash props
    isDeletedView = false,
    tabs,
    onRestore,
    onHardDelete,
}: OrgModulePageProps<T>) {
    const { checkPermission, user } = useAuth();
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteName, setDeleteName] = useState("");
    const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
    
    // --- Universal Quick Save State ---
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [isSaving, setIsSaving] = useState(false);

    const isAdmin = checkPermission(`${config.permissionPrefix}_MANAGE`);
    const canRead = checkPermission(`${config.permissionPrefix}_READ`);
    const ModuleIcon = config.icon;

    // --- Column Width Persistence ---
    const colWidthStorageKey = useMemo(() => {
        const baseKey = config.moduleKey || config.permissionPrefix.toLowerCase();
        return user?.id ? `${baseKey}-col-widths-${user.id}` : null;
    }, [config.moduleKey, config.permissionPrefix, user?.id]);

    useEffect(() => {
        if (!colWidthStorageKey) return;
        try {
            const saved = localStorage.getItem(colWidthStorageKey);
            if (saved) {
                const widths = JSON.parse(saved);
                setColumnWidths(widths);
                // Apply CSS variables
                Object.entries(widths).forEach(([key, w]) => {
                    document.documentElement.style.setProperty(`--col-w-${key}`, `${w}px`);
                });
            }
        } catch (e) { console.error("Error loading column widths", e); }
    }, [colWidthStorageKey]);

    const handleToggleOrgChart = async (id: string, checked: boolean) => {
        if (!onToggleOrgChart) return;
        try {
            await onToggleOrgChart(id, checked);
            toast.success("Đã cập nhật sơ đồ");
            refetch();
        } catch (error: any) {
            toast.error(`Lỗi: ${error?.message || "Không xác định"}`);
        }
    };

    const handleBulkToggle = async (show: boolean) => {
        if (!onBulkToggleOrgChart) return;
        try {
            await onBulkToggleOrgChart(show);
            toast.success(show ? "Đã bật tất cả sơ đồ" : "Đã tắt tất cả sơ đồ");
            refetch();
        } catch (error: any) {
            toast.error(`Lỗi: ${error?.message || "Không xác định"}`);
        }
    };

    // Helper to persist a column width immediately
    const saveColWidth = (colKey: string, width: number) => {
        if (!colWidthStorageKey) return;
        try {
            const saved = localStorage.getItem(colWidthStorageKey);
            const widths: Record<string, number> = saved ? JSON.parse(saved) : {};
            const newWidths = { ...widths, [colKey]: width };
            localStorage.setItem(colWidthStorageKey, JSON.stringify(newWidths));
            setColumnWidths(newWidths);
        } catch { /* ignore */ }
    };


    // ── Column config ──
    const columnConfigKey = config.moduleKey || config.permissionPrefix.toLowerCase();
    const implicitAuditKeys = useMemo(() => {
        const keys = new Set(['createdBy', 'createdAt', 'updatedBy', 'updatedAt']);
        config.columns.forEach(c => keys.delete(c.key));
        return keys;
    }, [config.columns]);

    const defaultColumns: ColumnDef[] = useMemo(() => {
        const cols: ColumnDef[] = config.columns.map(col => ({ key: col.key, label: col.label }));
        // Add audit columns if getAuditInfo is provided
        if (config.getAuditInfo) {
            const auditCols = [
                { key: 'createdBy', label: 'Người tạo', defaultVisible: false },
                { key: 'createdAt', label: 'Ngày tạo', defaultVisible: false },
                { key: 'updatedBy', label: 'Người sửa', defaultVisible: false },
                { key: 'updatedAt', label: 'Ngày sửa', defaultVisible: false },
            ];
            auditCols.forEach(ac => {
                if (implicitAuditKeys.has(ac.key)) {
                    cols.push(ac);
                }
            });
        }
        return cols;
    }, [config.columns, config.getAuditInfo, implicitAuditKeys]);
    const { visibleColumns, allColumns } = useTableColumns(columnConfigKey, defaultColumns);

    const visibleOrgColumns = useMemo(() => {
        const colMap = new Map(config.columns.map(c => [c.key, c]));
        return visibleColumns
            .filter(vc => !implicitAuditKeys.has(vc.key))
            .map(vc => colMap.get(vc.key))
            .filter((c): c is OrgColumnDef<T> => !!c);
    }, [visibleColumns, config.columns, implicitAuditKeys]);
    
    // --- Column Interceptor for Quick Save ---
    const wrappedOrgColumns = useMemo(() => {
        return visibleOrgColumns.map(col => {
            if (col.key === "showOnOrgChart") {
                return {
                    ...col,
                    render: (item: T) => {
                        const id = config.getId(item);
                        const value = (item as any).showOnOrgChart;
                        
                        return (
                            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                                <Switch
                                    checked={!!value}
                                    className={cn(
                                        "scale-90 transition-all",
                                        value ? "data-[state=checked]:bg-emerald-500" : ""
                                    )}
                                    onCheckedChange={(checked) => handleToggleOrgChart(id, checked)}
                                />
                            </div>
                        );
                    }
                };
            }
            return col;
        });
    }, [visibleOrgColumns, handleToggleOrgChart, config]);

    // Visible audit columns (for header + cell rendering)
    const visibleAuditColumns = useMemo(() =>
        visibleColumns.filter(vc => implicitAuditKeys.has(vc.key)),
        [visibleColumns, implicitAuditKeys]
    );

    // ── Summary metrics (cached — only update when NOT searching) ──
    const [cachedStats, setCachedStats] = useState({ total: 0, active: 0, inactive: 0 });

    useEffect(() => {
        // Always set cache if we are not actively searching
        if (!search) {
            // If data is empty (e.g. all items deleted), reset immediately
            if (data.length === 0) {
                setCachedStats({ total: meta?.total ?? 0, active: 0, inactive: 0 });
                return;
            }

            let active = meta?.active ?? 0;
            let inactive = meta?.inactive ?? 0;

            // Fallback: If backend doesn't provide these metadata fields, calculate from current page data
            if (active === 0 && inactive === 0 && meta?.active === undefined && data) {
                if (config.getStatus) {
                    data.forEach((item) => {
                        if (config.getStatus!(item) === "ACTIVE") active++;
                        else inactive++;
                    });
                }
            }

            setCachedStats({
                total: meta?.total ?? (data?.length || 0),
                active,
                inactive,
            });
        } else if (search && data.length === 0) {
            // Also reset when search yields 0 results to prevent stale counts showing
            setCachedStats({ total: 0, active: 0, inactive: 0 });
        }
    }, [search, data, meta, config]);


    const metrics = cachedStats;

    // ── Handlers ──
    const handleSelectAll = (checked: boolean) => {
        if (checked && data) {
            setSelectedRows(data.map((d) => config.getId(d)));
        } else {
            setSelectedRows([]);
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedRows((prev) => [...prev, id]);
        } else {
            setSelectedRows((prev) => prev.filter((r) => r !== id));
        }
    };

    // ── Drag-select & Shift+Click ──
    const dragRef = useRef<{ isDragging: boolean; selecting: boolean }>({ isDragging: false, selecting: true });
    const lastClickedIndex = useRef<number | null>(null);

    const handleRowMouseDown = useCallback((index: number, id: string, e: React.MouseEvent) => {
        e.preventDefault();
        const isSelected = selectedRows.includes(id);
        // Shift+Click range selection
        if (e.shiftKey && lastClickedIndex.current !== null) {
            const start = Math.min(lastClickedIndex.current, index);
            const end = Math.max(lastClickedIndex.current, index);
            const rangeIds = data.slice(start, end + 1).map(item => config.getId(item));
            setSelectedRows(prev => {
                const newSet = new Set(prev);
                rangeIds.forEach(rid => newSet.add(rid));
                return Array.from(newSet);
            });
            return;
        }
        // Start drag
        dragRef.current = { isDragging: true, selecting: !isSelected };
        lastClickedIndex.current = index;
        handleSelectRow(id, !isSelected);
    }, [selectedRows, data, config]);

    const handleRowMouseEnter = useCallback((id: string) => {
        if (!dragRef.current.isDragging) return;
        if (dragRef.current.selecting) {
            setSelectedRows(prev => prev.includes(id) ? prev : [...prev, id]);
        } else {
            setSelectedRows(prev => prev.filter(r => r !== id));
        }
    }, []);

    useEffect(() => {
        const handleMouseUp = () => { dragRef.current.isDragging = false; };
        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, []);

    const handleDeleteConfirm = async () => {
        if (!deleteId) return;
        try {
            const result = await onDelete(deleteId);

            toast.success("Đã chuyển vào Thùng rác", {
                description: `Dữ liệu sẽ được lưu trong 30 ngày.`,
                action: result && typeof result === "object" && result.batchId ? {
                    label: "Khôi phục",
                    onClick: async () => {
                        try {
                            const { trashApi } = await import("@/lib/api/settings/trash");
                            await trashApi.restoreBatch(result.batchId as string);
                            toast.success("Đã khôi phục thành công");
                            refetch();
                        } catch (error) {
                            toast.error("Lỗi khi khôi phục dữ liệu");
                        }
                    }
                } : undefined,
                duration: 5000,
            });

            setDeleteId(null);
            refetch();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi xóa");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRows.length === 0) return;
        if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedRows.length} ${config.singularLabel} đã chọn?`)) return;

        try {
            if (onBulkDelete) {
                await onBulkDelete(selectedRows);
            } else {
                const results = await Promise.allSettled(selectedRows.map((id) => onDelete(id)));
                const fulfilled = results.filter((r) => r.status === "fulfilled").length;
                const rejected = results.filter((r) => r.status === "rejected");
                if (fulfilled > 0) toast.success(`Đã xóa thành công ${fulfilled} ${config.singularLabel}`);
                if (rejected.length > 0) {
                    const msg = (rejected[0] as PromiseRejectedResult).reason?.response?.data?.message || "Có lỗi khi xóa";
                    toast.error(`Có ${rejected.length} lỗi: ${msg}`);
                }
            }
            setSelectedRows([]);
            refetch();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error?.message || "Có lỗi xảy ra");
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortKey !== columnKey) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:bg-muted/50 rounded" />;
        return sortDir === "asc"
            ? <ChevronUp className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />
            : <ChevronDown className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />;
    };

    const totalColumnCount = wrappedOrgColumns.length + visibleAuditColumns.length + 2; // +1 for selection, +1 for actions
    const totalPages = data ? Math.ceil(data.length / pageSize) : 0;

    if (!canRead) {
        return (
            <div className="flex items-center justify-center p-8 mt-20 text-muted-foreground">
                Bạn không có quyền truy cập trang này.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-2 p-2 bg-background">
            {/* ─── Stats Cards ─── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`glass-card rounded-xl border-l-4 ${config.accentBorderClass} p-3.5 flex items-center justify-between`}>
                    <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tổng {config.title}</p>
                        <h3 className="text-2xl font-bold mt-1 tracking-tight">{metrics.total}</h3>
                    </div>
                    <div className={`h-10 w-10 ${config.solidBg || config.accentBgClass} rounded-2xl flex items-center justify-center ${config.solidBg ? 'text-white' : config.accentTextClass} shadow-sm`}>
                        <ModuleIcon className="h-5 w-5" />
                    </div>
                </div>

                <div className="glass-card rounded-xl border-l-4 border-l-emerald-500 p-3.5 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Đang hoạt động</p>
                        <h3 className="text-2xl font-bold mt-1 tracking-tight text-emerald-600 dark:text-emerald-400">{metrics.active}</h3>
                    </div>
                    <div className="h-10 w-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                </div>

                <div className="glass-card rounded-xl border-l-4 border-l-rose-500 p-3.5 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ngừng hoạt động</p>
                        <h3 className="text-2xl font-bold mt-1 tracking-tight text-rose-600 dark:text-rose-400">{metrics.inactive}</h3>
                    </div>
                    <div className="h-10 w-10 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
                        <XCircle className="h-5 w-5" />
                    </div>
                </div>
            </div>

            {/* ─── Header ─── */}
            <div className="glass shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <PageHeader
                    className="mb-0 border-none"
                    backHref={config.backHref}
                    backLabel="Quay về Cài đặt"
                    title={
                        <div className="flex items-center gap-2.5">
                            <div className={`h-9 w-9 ${config.solidBg || config.accentBgClass} rounded-xl flex items-center justify-center ${config.solidBg ? 'text-white' : config.accentTextClass} shadow-sm`}>
                                <ModuleIcon className="h-4.5 w-4.5" />
                            </div>
                            <span className="font-bold tracking-wide uppercase">Quản lý </span>
                            <span className={`font-bold tracking-wide uppercase bg-gradient-to-r ${config.titleGradient || 'from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400'} bg-clip-text text-transparent`}>
                                {config.title}
                            </span>
                            {search && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.accentBgClass} ${config.accentTextClass} animate-in zoom-in`}>
                                    {data.length} kết quả
                                </span>
                            )}
                        </div>
                    }
                    search={
                        <div className="flex items-center gap-4">
                            {tabs && <div className="hidden md:block">{tabs}</div>}
                            <div className="relative group">
                                <SearchBar
                                    placeholder={config.searchPlaceholder}
                                    value={search}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    className="bg-background/50 border-border/50 focus:bg-background transition-all"
                                />
                            </div>
                        </div>
                    }
                    onRefresh={onRefreshWithReset ?? refetch}
                    isRefreshing={isLoading}
                    refreshLabel="Làm mới"
                >
                    <div className="flex items-center gap-2">
                        {!isDeletedView && (
                            <>
                                <Button onClick={onCreateClick} className="h-9 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 px-5 rounded-lg font-semibold">
                                    <Plus className="mr-2 h-4 w-4" /> Thêm mới
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="h-9 bg-white/80 backdrop-blur-sm border-border/50 hover:bg-slate-100 transition-all rounded-lg shadow-sm gap-2">
                                            <Settings2 className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-semibold text-sm">Tùy chọn</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[200px] border-border/50 shadow-2xl backdrop-blur-xl bg-white/90">
                                        {onExport && (
                                            <PermissionGate permission="EXPORT_DATA">
                                                <DropdownMenuItem onClick={onExport} disabled={isExporting} className="py-2.5 cursor-pointer rounded-lg mx-1">
                                                    <FileDown className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                    <span className="font-medium">Xuất dữ liệu Excel</span>
                                                </DropdownMenuItem>
                                            </PermissionGate>
                                        )}
                                        {onImport && (
                                            <PermissionGate permission="IMPORT_DATA">
                                                <DropdownMenuItem onClick={onImport} disabled={isImporting} className="py-2.5 cursor-pointer rounded-lg mx-1">
                                                    <Upload className="mr-2 h-4 w-4 text-primary" />
                                                    <span className="font-medium">Nhập dữ liệu Excel</span>
                                                </DropdownMenuItem>
                                            </PermissionGate>
                                        )}
                                        <DropdownMenuSeparator className="bg-border/50" />
                                        {onBulkToggleOrgChart && (
                                            <>
                                                <DropdownMenuItem 
                                                    onClick={() => handleBulkToggle(true)} 
                                                    disabled={isSaving}
                                                    className="py-2.5 cursor-pointer rounded-lg mx-1"
                                                >
                                                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                                                    <span className="font-medium text-emerald-600">Bật tất cả sơ đồ</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handleBulkToggle(false)} 
                                                    disabled={isSaving}
                                                    className="py-2.5 cursor-pointer rounded-lg mx-1"
                                                >
                                                    <XCircle className="mr-2 h-4 w-4 text-rose-500" />
                                                    <span className="font-medium text-rose-600">Tắt tất cả sơ đồ</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-border/50" />
                                            </>
                                        )}
                                        <DropdownMenuItem onClick={() => setIsColumnConfigOpen(true)} className="py-2.5 cursor-pointer rounded-lg mx-1">
                                            <Columns3 className="mr-2 h-4 w-4 text-amber-500" />
                                            <span className="font-medium">Sắp xếp cột</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        )}
                    </div>
                </PageHeader>
            </div>

            {/* ─── Table ─── */}
            <div className="glass-card rounded-xl border-border/50 shadow-xl flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                <Table className="relative w-full">
                    <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10 shadow-sm border-b border-border">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-[40px] h-12 px-4">
                                <Checkbox
                                    checked={data && data.length > 0 && selectedRows.length === data.length}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                />
                            </TableHead>
                            {visibleOrgColumns.map((col) => (
                                <TableHead
                                    key={col.key}
                                    style={{
                                        width: `var(--col-w-${col.key}, auto)`,
                                        minWidth: `var(--col-w-${col.key}, 60px)`,
                                    }}
                                    className={`h-10 font-medium relative group ${col.sortable ? "cursor-pointer hover:bg-muted/80 transition-colors" : ""} ${col.className || ""}`}
                                    onClick={col.sortable ? () => onSort(col.key) : undefined}
                                >
                                    <div className="flex items-center">
                                        {col.label} {col.sortable && <SortIcon columnKey={col.key} />}
                                    </div>
                                    {/* Resize Handle */}
                                    <div
                                        className="absolute right-0 top-0 h-full w-4 cursor-col-resize flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            const startX = e.clientX;
                                            const startW = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect().width;
                                            const onMove = (ev: MouseEvent) => {
                                                const newW = Math.max(60, startW + ev.clientX - startX);
                                                saveColWidth(col.key, newW);
                                                document.documentElement.style.setProperty(`--col-w-${col.key}`, `${newW}px`);
                                            };
                                            const onUp = () => {
                                                window.removeEventListener('mousemove', onMove);
                                                window.removeEventListener('mouseup', onUp);
                                            };
                                            window.addEventListener('mousemove', onMove);
                                            window.addEventListener('mouseup', onUp);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="w-[2px] h-4 bg-border group-hover:bg-blue-400 rounded-full" />
                                    </div>
                                </TableHead>
                            ))}
                            {visibleAuditColumns.map(col => (
                                <TableHead 
                                    key={col.key} 
                                    style={{
                                        width: `var(--col-w-${col.key}, auto)`,
                                        minWidth: `var(--col-w-${col.key}, 60px)`,
                                    }}
                                    className="h-10 font-medium whitespace-nowrap cursor-pointer hover:bg-muted/80 transition-colors group relative" 
                                    onClick={() => onSort(col.key)}
                                >
                                    <div className="flex items-center">{col.label} <SortIcon columnKey={col.key} /></div>
                                    {/* Resize Handle */}
                                    <div
                                        className="absolute right-0 top-0 h-full w-4 cursor-col-resize flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            const startX = e.clientX;
                                            const startW = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect().width;
                                            const onMove = (ev: MouseEvent) => {
                                                const newW = Math.max(60, startW + ev.clientX - startX);
                                                saveColWidth(col.key, newW);
                                                document.documentElement.style.setProperty(`--col-w-${col.key}`, `${newW}px`);
                                            };
                                            const onUp = () => {
                                                window.removeEventListener('mousemove', onMove);
                                                window.removeEventListener('mouseup', onUp);
                                            };
                                            window.addEventListener('mousemove', onMove);
                                            window.addEventListener('mouseup', onUp);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="w-[2px] h-4 bg-border group-hover:bg-blue-400 rounded-full" />
                                    </div>
                                </TableHead>
                            ))}
                            <TableHead className="w-[80px] h-10 px-4 text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={totalColumnCount} className="text-center py-10 text-muted-foreground">
                                    Đang tải dữ liệu...
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={totalColumnCount} className="text-center py-16">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground/60">
                                        <ModuleIcon className="h-12 w-12 mb-3 text-muted-foreground/40" />
                                        <p className="text-base font-medium text-muted-foreground">Chưa có {config.singularLabel} nào</p>
                                        <p className="text-sm mt-1">Bấm &quot;Thêm mới&quot; hoặc &quot;Nhập Excel&quot; để bắt đầu.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item, index) => {
                                const id = config.getId(item);
                                return (
                                    <MemoizedOrgRow
                                        key={id}
                                        item={item}
                                        index={index}
                                        id={id}
                                        isSelected={selectedRows.includes(id)}
                                        visibleOrgColumns={wrappedOrgColumns}
                                        visibleAuditColumns={visibleAuditColumns}
                                        config={config}
                                        onEditClick={onEditClick}
                                        handleRowMouseEnter={handleRowMouseEnter}
                                        handleRowMouseDown={handleRowMouseDown}
                                        handleSelectRow={handleSelectRow}
                                        lastClickedIndex={lastClickedIndex}
                                        formatDate={formatDate}
                                        isDeletedView={isDeletedView}
                                        onRestore={onRestore}
                                        onHardDelete={onHardDelete}
                                        onDelete={() => {
                                            setDeleteId(id);
                                            setDeleteName(config.getName(item));
                                        }}
                                    />
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ─── Footer — same as departments ─── */}
            <div className="flex items-center justify-between mt-auto bg-card p-2 rounded-xl border border-border shadow-sm">
                {selectedRows.length > 0 && (
                    <div className="flex items-center gap-3 bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20 animate-in fade-in slide-in-from-bottom-2">
                        <span className="text-sm text-indigo-700 dark:text-indigo-400 font-semibold shadow-sm">Đã chọn ({selectedRows.length})</span>
                        {!isDeletedView ? (
                            <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="shadow-sm hover:shadow h-8 rounded-md bg-rose-500 hover:bg-rose-600">
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Xóa hàng loạt
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                {onRestore && (
                                    <Button size="sm" variant="outline" onClick={async () => {
                                        if (!confirm(`Bạn có chắc muốn khôi phục ${selectedRows.length} mục đã chọn?`)) return;
                                        let success = 0; let failed = 0;
                                        for (const id of selectedRows) {
                                            try { await onRestore(id); success++; } catch (e) { failed++; }
                                        }
                                        if (success > 0) toast.success(`Khôi phục thành công ${success} mục.`);
                                        if (failed > 0) toast.error(`Có ${failed} lỗi khi khôi phục.`);
                                        setSelectedRows([]);
                                        refetch();
                                    }} className="h-8 shadow-sm">
                                        <RefreshCcw className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Khôi phục
                                    </Button>
                                )}
                                {onHardDelete && (
                                    <Button size="sm" variant="destructive" onClick={async () => {
                                        if (!confirm(`CẢNH BÁO MẤT DỮ LIỆU.\nBạn có chắc muốn xóa VĨNH VIỄN ${selectedRows.length} mục đã chọn?`)) return;
                                        let success = 0; let failed = 0;
                                        for (const id of selectedRows) {
                                            try { await onHardDelete(id); success++; } catch (e) { failed++; }
                                        }
                                        if (success > 0) toast.success(`Xóa vĩnh viễn ${success} mục.`);
                                        if (failed > 0) toast.error(`Có ${failed} lỗi khi xóa.`);
                                        setSelectedRows([]);
                                        refetch();
                                    }} className="h-8 shadow-sm bg-rose-500 hover:bg-rose-600">
                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Xóa vĩnh viễn
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
                <div className={selectedRows.length > 0 ? "" : "ml-auto"}>
                    <PaginationControl
                        currentPage={page}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        totalCount={cachedStats.total || meta?.total || 0}
                        filteredCount={search ? (meta?.total ?? data.length) : undefined}
                        onPageChange={(newPage) => onPageChange(newPage)}
                        onPageSizeChange={(newSize) => {
                            onPageSizeChange(newSize);
                            onPageChange(1);
                        }}
                    />
                </div>
            </div>

            {/* ─── Delete Confirmation ─── */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này không thể hoàn tác. <span className="font-semibold text-foreground">{deleteName}</span> sẽ bị xóa vĩnh viễn khỏi hệ thống.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ─── Dialogs ─── */}
            {dialogs}

            {/* ─── Column Config ─── */}
            <ColumnConfigDialog
                open={isColumnConfigOpen}
                onOpenChange={setIsColumnConfigOpen}
                moduleKey={columnConfigKey}
                allColumns={allColumns}
                defaultColumns={defaultColumns}
            />

        </div>
    );
}

// Extracted Memoized Row to prevent UI freezing on massive check/uncheck
const MemoizedOrgRow = React.memo(({
    item,
    index,
    id,
    isSelected,
    visibleOrgColumns,
    visibleAuditColumns,
    config,
    onEditClick,
    handleRowMouseEnter,
    handleRowMouseDown,
    handleSelectRow,
    lastClickedIndex,
    formatDate,
    isDeletedView,
    onRestore,
    onHardDelete,
    onDelete,
}: {
    item: any;
    index: number;
    id: string;
    isSelected: boolean;
    visibleOrgColumns: any[];
    visibleAuditColumns: any[];
    config: any;
    onEditClick: (item: any) => void;
    handleRowMouseEnter: (id: string) => void;
    handleRowMouseDown: (index: number, id: string, e: React.MouseEvent) => void;
    handleSelectRow: (id: string, checked: boolean) => void;
    lastClickedIndex: React.MutableRefObject<number | null>;
    formatDate: (d?: string) => string;
    isDeletedView?: boolean;
    onRestore?: (id: string) => Promise<void>;
    onHardDelete?: (id: string) => Promise<void>;
    onDelete?: () => void;
}) => {
    return (
        <TableRow
            data-state={isSelected && "selected"}
            className="group hover:bg-muted/80 hover:shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-200 border-b border-border"
            onMouseEnter={() => handleRowMouseEnter(id)}
        >
            <TableCell
                className="px-4 py-3 select-none cursor-pointer"
                onMouseDown={(e) => handleRowMouseDown(index, id, e)}
            >
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                        lastClickedIndex.current = index;
                        handleSelectRow(id, checked as boolean);
                    }}
                    className="transition-transform data-[state=checked]:scale-105 pointer-events-none"
                />
            </TableCell>
            {visibleOrgColumns.map((col) => {
                const isClickable = config.clickableKeys?.includes(col.key);
                return (
                    <TableCell key={col.key} className={col.className}>
                        {isClickable ? (
                            <button
                                className="text-left hover:underline transition-colors cursor-pointer"
                                onClick={() => onEditClick(item)}
                            >
                                {col.render(item)}
                            </button>
                        ) : (
                            col.render(item)
                        )}
                    </TableCell>
                );
            })}
            {visibleAuditColumns.length > 0 && config.getAuditInfo && (() => {
                const audit = config.getAuditInfo!(item);
                const auditRenderers: Record<string, () => React.ReactNode> = {
                    createdBy: () => <span>{audit.createdBy || '-'}</span>,
                    createdAt: () => <span>{formatDate(audit.createdAt)}</span>,
                    updatedBy: () => <span>{audit.updatedBy || '-'}</span>,
                    updatedAt: () => <span>{formatDate(audit.updatedAt)}</span>,
                };
                return visibleAuditColumns.map(col => (
                    <TableCell key={col.key} className="text-sm text-muted-foreground/80">
                        {auditRenderers[col.key]?.() || '—'}
                    </TableCell>
                ));
            })()}
            {/* Actions Column */}
            <TableCell className="text-right px-4 pr-6">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 flex items-center gap-1.5 px-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-white border-transparent hover:border-border/40 border">
                            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-[11px] font-medium text-muted-foreground">Tùy chọn</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                        {!isDeletedView ? (
                            <>
                                <DropdownMenuItem onClick={() => onEditClick(item)} className="cursor-pointer">
                                    Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => onDelete?.()}
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                    Xóa
                                </DropdownMenuItem>
                            </>
                        ) : (
                            <>
                                {onRestore && (
                                    <DropdownMenuItem onClick={() => onRestore(id)} className="cursor-pointer">
                                        Khôi phục
                                    </DropdownMenuItem>
                                )}
                                {onHardDelete && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            if (confirm("Chắc chắn xóa vĩnh viễn?")) {
                                                onHardDelete(id);
                                            }
                                        }}
                                        className="cursor-pointer text-destructive focus:text-destructive"
                                    >
                                        Xóa vĩnh viễn
                                    </DropdownMenuItem>
                                )}
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.id === nextProps.id &&
        prevProps.item === nextProps.item &&
        prevProps.visibleOrgColumns === nextProps.visibleOrgColumns &&
        prevProps.visibleAuditColumns === nextProps.visibleAuditColumns
    );
});
