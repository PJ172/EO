"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trashApi, TrashModule, TrashItem, TrashSummary } from "@/lib/api/settings/trash";
import { useTrashConfigs, useUpdateTrashConfig, useRunTrashPurge, TrashRetentionConfig } from "@/services/trash-config.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControl } from "@/components/ui/pagination-control";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { PasswordConfirmDialog } from "@/components/ui/password-confirm-dialog";
import { useSortState } from "@/hooks/use-sort-state";
import {
    Trash2,
    RefreshCcw,
    TrashIcon,
    Settings2,
    Clock,
    FlaskConical,
    Zap,
    AlertTriangle,
    Search,
    ChevronUp,
    ChevronDown,
    MoreHorizontal,
    LayoutList,
    ArchiveRestore,
    Eye,
    Code2,
    FileJson,
    Info,
    Building2,
    Factory,
    Landmark,
    Network,
    Component,
    Medal,
    Users,
    UserCircle,
    ShieldCheck,
    FileText,
    FolderHeart,
    Kanban,
    CheckSquare,
    Target,
    Newspaper,
    Laptop,
    Ticket,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";

// ─── Retention Config Row ───────────────────────────────────────────
function RetentionConfigRow({ config }: { config: TrashRetentionConfig }) {
    const [days, setDays] = useState(config.retentionDays.toString());
    const update = useUpdateTrashConfig();

    const handleSave = async () => {
        const numDays = parseInt(days, 10);
        if (isNaN(numDays) || numDays < 0) {
            toast.error("Số ngày không hợp lệ (nhập 0 để không tự xóa)");
            return;
        }
        try {
            await update.mutateAsync({ moduleKey: config.moduleKey, dto: { retentionDays: numDays } });
            toast.success(`Đã lưu cấu hình cho "${config.moduleName}"`);
        } catch {
            toast.error("Lỗi khi lưu cấu hình");
        }
    };

    const handleToggle = async (enabled: boolean) => {
        try {
            await update.mutateAsync({ moduleKey: config.moduleKey, dto: { isEnabled: enabled } });
            toast.success(enabled ? "Đã bật tự động dọn dẹp" : "Đã tắt tự động dọn dẹp");
        } catch {
            toast.error("Lỗi khi cập nhật");
        }
    };

    return (
        <div className="flex items-center justify-between gap-4 py-3 px-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{config.moduleName}</p>
                    <p className="text-xs text-muted-foreground">
                        {config.isEnabled && config.retentionDays > 0
                            ? `Tự động xóa sau ${config.retentionDays} ngày`
                            : config.retentionDays === 0
                                ? "Không tự xóa (lưu vĩnh viễn)"
                                : "Tắt tự động dọn dẹp"}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
                <Switch
                    checked={config.isEnabled}
                    onCheckedChange={handleToggle}
                    disabled={update.isPending}
                    title={config.isEnabled ? "Tắt tự động dọn dẹp" : "Bật tự động dọn dẹp"}
                />
                <div className="flex items-center gap-1.5">
                    <Input
                        type="number"
                        min={0}
                        value={days}
                        onChange={e => setDays(e.target.value)}
                        className="w-20 h-8 text-sm text-center"
                        disabled={!config.isEnabled || update.isPending}
                        title="Số ngày lưu trữ (0 = vĩnh viễn)"
                    />
                    <span className="text-xs text-muted-foreground w-8">ngày</span>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    onClick={handleSave}
                    disabled={!config.isEnabled || update.isPending || days === config.retentionDays.toString()}
                >
                    Lưu
                </Button>
            </div>
        </div>
    );
}

const MODULE_LIST: { value: TrashModule; label: string; icon: any; bgClass: string; iconClass: string; textClass: string; bgLightClass: string; badgeClass: string }[] = [
    { value: "companies", label: "Công ty", icon: Building2, bgClass: "bg-gradient-to-br from-rose-500 to-rose-700", iconClass: "text-white", textClass: "text-rose-600", bgLightClass: "bg-rose-500/10 border-l-rose-500", badgeClass: "bg-rose-500/20 text-rose-700" },
    { value: "factories", label: "Nhà máy", icon: Factory, bgClass: "bg-gradient-to-br from-orange-500 to-orange-700", iconClass: "text-white", textClass: "text-orange-600", bgLightClass: "bg-orange-500/10 border-l-orange-500", badgeClass: "bg-orange-500/20 text-orange-700" },
    { value: "divisions", label: "Khối", icon: Landmark, bgClass: "bg-gradient-to-br from-amber-500 to-amber-700", iconClass: "text-white", textClass: "text-amber-600", bgLightClass: "bg-amber-500/10 border-l-amber-500", badgeClass: "bg-amber-500/20 text-amber-700" },
    { value: "departments", label: "Phòng ban", icon: Network, bgClass: "bg-gradient-to-br from-emerald-500 to-emerald-700", iconClass: "text-white", textClass: "text-emerald-600", bgLightClass: "bg-emerald-500/10 border-l-emerald-500", badgeClass: "bg-emerald-500/20 text-emerald-700" },
    { value: "sections", label: "Bộ phận", icon: Component, bgClass: "bg-gradient-to-br from-teal-500 to-teal-700", iconClass: "text-white", textClass: "text-teal-600", bgLightClass: "bg-teal-500/10 border-l-teal-500", badgeClass: "bg-teal-500/20 text-teal-700" },
    { value: "jobTitles", label: "Chức vụ", icon: Medal, bgClass: "bg-gradient-to-br from-cyan-500 to-cyan-700", iconClass: "text-white", textClass: "text-cyan-600", bgLightClass: "bg-cyan-500/10 border-l-cyan-500", badgeClass: "bg-cyan-500/20 text-cyan-700" },
    { value: "employees", label: "Nhân sự", icon: Users, bgClass: "bg-gradient-to-br from-blue-500 to-blue-700", iconClass: "text-white", textClass: "text-blue-600", bgLightClass: "bg-blue-500/10 border-l-blue-500", badgeClass: "bg-blue-500/20 text-blue-700" },
    { value: "users", label: "Tài khoản", icon: UserCircle, bgClass: "bg-gradient-to-br from-indigo-500 to-indigo-700", iconClass: "text-white", textClass: "text-indigo-600", bgLightClass: "bg-indigo-500/10 border-l-indigo-500", badgeClass: "bg-indigo-500/20 text-indigo-700" },
    { value: "roles", label: "Vai trò", icon: ShieldCheck, bgClass: "bg-gradient-to-br from-violet-500 to-violet-700", iconClass: "text-white", textClass: "text-violet-600", bgLightClass: "bg-violet-500/10 border-l-violet-500", badgeClass: "bg-violet-500/20 text-violet-700" },
    { value: "documents", label: "Tài liệu", icon: FileText, bgClass: "bg-gradient-to-br from-purple-500 to-purple-700", iconClass: "text-white", textClass: "text-purple-600", bgLightClass: "bg-purple-500/10 border-l-purple-500", badgeClass: "bg-purple-500/20 text-purple-700" },
    { value: "files", label: "Tập tin", icon: FolderHeart, bgClass: "bg-gradient-to-br from-fuchsia-500 to-fuchsia-700", iconClass: "text-white", textClass: "text-fuchsia-600", bgLightClass: "bg-fuchsia-500/10 border-l-fuchsia-500", badgeClass: "bg-fuchsia-500/20 text-fuchsia-700" },
    { value: "projects", label: "Dự án", icon: Kanban, bgClass: "bg-gradient-to-br from-pink-500 to-pink-700", iconClass: "text-white", textClass: "text-pink-600", bgLightClass: "bg-pink-500/10 border-l-pink-500", badgeClass: "bg-pink-500/20 text-pink-700" },
    { value: "tasks", label: "Công việc", icon: CheckSquare, bgClass: "bg-gradient-to-br from-green-500 to-green-700", iconClass: "text-white", textClass: "text-green-600", bgLightClass: "bg-green-500/10 border-l-green-500", badgeClass: "bg-green-500/20 text-green-700" },
    { value: "kpi", label: "KPI", icon: Target, bgClass: "bg-gradient-to-br from-red-500 to-red-700", iconClass: "text-white", textClass: "text-red-600", bgLightClass: "bg-red-500/10 border-l-red-500", badgeClass: "bg-red-500/20 text-red-700" },
    { value: "newsArticles", label: "Bảng tin", icon: Newspaper, bgClass: "bg-gradient-to-br from-sky-500 to-sky-700", iconClass: "text-white", textClass: "text-sky-600", bgLightClass: "bg-sky-500/10 border-l-sky-500", badgeClass: "bg-sky-500/20 text-sky-700" },
    { value: "itAssets", label: "Tài sản IT", icon: Laptop, bgClass: "bg-gradient-to-br from-lime-500 to-lime-700", iconClass: "text-white", textClass: "text-lime-600", bgLightClass: "bg-lime-500/10 border-l-lime-500", badgeClass: "bg-lime-500/20 text-lime-700" },
    { value: "tickets", label: "Ticket IT", icon: Ticket, bgClass: "bg-gradient-to-br from-slate-500 to-slate-700", iconClass: "text-white", textClass: "text-slate-600", bgLightClass: "bg-slate-500/10 border-l-slate-500", badgeClass: "bg-slate-500/20 text-slate-700" },
];

// Column definitions for resize
const TRASH_COLUMNS = [
    { key: "name", label: "Tên cấu phần", sortable: true },
    { key: "code", label: "Mã", sortable: false },
    { key: "extraInfo", label: "Thông tin thêm", sortable: false },
    { key: "deletedAt", label: "Ngày xóa", sortable: true },
    { key: "deletedBy", label: "Người xóa", sortable: false },
    { key: "expiry", label: "Hạn lưu trữ", sortable: false },
];

const COL_WIDTH_KEY = "trash-col-widths";

// ─── Main Page ──────────────────────────────────────────────────────
export default function TrashPage() {
    const [activeTab, setActiveTab] = useState<TrashModule>("employees");
    const [showConfig, setShowConfig] = useState(false);
    const [search, setSearch] = useState("");
    const { sortKey, sortDir, handleSort: toggleSort } = useSortState("trash", "deletedAt", "desc");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [previewItem, setPreviewItem] = useState<TrashItem | null>(null);

    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
    }>({
        open: false,
        title: "",
        description: "",
        onConfirm: () => { },
    });

    const queryClient = useQueryClient();

    // Restore saved col widths on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(COL_WIDTH_KEY);
            if (saved) {
                const widths: Record<string, number> = JSON.parse(saved);
                Object.entries(widths).forEach(([key, w]) => {
                    document.documentElement.style.setProperty(`--trash-col-w-${key}`, `${w}px`);
                });
            }
        } catch { /* ignore */ }
    }, []);

    const saveColWidth = useCallback((colKey: string, width: number) => {
        try {
            const saved = localStorage.getItem(COL_WIDTH_KEY);
            const widths: Record<string, number> = saved ? JSON.parse(saved) : {};
            widths[colKey] = width;
            localStorage.setItem(COL_WIDTH_KEY, JSON.stringify(widths));
        } catch { /* ignore */ }
    }, []);

    // Sort icon — only shown when column is actively sorted
    const SortIcon = ({ field }: { field: string }) => {
        if (sortKey !== field) return null;
        return sortDir === "asc"
            ? <ChevronUp className="ml-1.5 shrink-0 h-3.5 w-3.5 text-foreground" />
            : <ChevronDown className="ml-1.5 shrink-0 h-3.5 w-3.5 text-foreground" />;
    };

    useEffect(() => {
        setSelectedRows([]);
        setPage(1);
    }, [activeTab, search, sortKey, sortDir]);

    const { data: summary } = useQuery<TrashSummary>({
        queryKey: ["trash", "summary"],
        queryFn: trashApi.getSummary,
    });

    const { data: itemsData, isLoading: loadingItems } = useQuery({
        queryKey: ["trash", "items", activeTab, search, sortKey, sortDir, page, pageSize],
        queryFn: () => trashApi.getItems(activeTab, {
            search: search || undefined,
            sortBy: sortKey as any,
            sortOrder: sortDir,
            page,
            limit: pageSize
        }),
    });

    const { data: previewData, isLoading: loadingPreview } = useQuery({
        queryKey: ["trash", "preview", activeTab, previewItem?.id],
        queryFn: () => previewItem ? trashApi.getItemDetail(activeTab, previewItem.id) : null,
        enabled: !!previewItem,
    });

    const { data: configs, isLoading: loadingConfigs } = useTrashConfigs();
    const runPurge = useRunTrashPurge();

    const currentConfig = configs?.find(c => c.moduleKey === activeTab);
    const retentionDays = currentConfig?.retentionDays ?? 30;

    const restoreMutation = useMutation({
        mutationFn: ({ module, id }: { module: TrashModule; id: string }) =>
            trashApi.restoreItem(module, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trash"] });
            queryClient.invalidateQueries({ queryKey: [activeTab] });
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Lỗi khi khôi phục");
        },
    });

    const restoreBatchMutation = useMutation({
        mutationFn: (batchId: string) => trashApi.restoreBatch(batchId),
        onSuccess: (res) => {
            if (res.conflicts?.length > 0) {
                toast.warning(`Khôi phục ${res.restored} mục. Có lỗi: ${res.conflicts.join(", ")}`);
            }
            queryClient.invalidateQueries({ queryKey: ["trash"] });
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Lỗi khi khôi phục nhóm");
        },
    });

    const hardDeleteMutation = useMutation({
        mutationFn: ({ module, id }: { module: TrashModule; id: string }) =>
            trashApi.hardDeleteItem(module, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trash"] });
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Lỗi khi xóa vĩnh viễn");
        },
    });

    const emptyTrashMutation = useMutation({
        mutationFn: (module?: TrashModule) => trashApi.emptyTrash(module),
        onSuccess: (res) => {
            toast.success(res.message);
            queryClient.invalidateQueries({ queryKey: ["trash"] });
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Lỗi dọn rác");
        },
    });

    const handleRestoreGroup = async (item: TrashItem) => {
        if (!item.deletedBatchId) return;
        if (window.confirm(`Mục này nằm trong 1 nhóm bị xóa. Bạn có muốn khôi phục toàn bộ nhóm không?\n\nOK = Khôi phục NHÓM. Cancel = Khôi phục ĐƠN LẺ.`)) {
            restoreBatchMutation.mutate(item.deletedBatchId as string);
            toast.success("Đã gửi yêu cầu khôi phục nhóm.");
        } else {
            restoreMutation.mutate({ module: activeTab, id: item.id });
            toast.success("Khôi phục thành công.");
        }
    };

    const handleRestoreIds = async (ids: string[]) => {
        if (!confirm(`Bạn có chắc muốn khôi phục ${ids.length} mục đã chọn?`)) return;
        let successCount = 0;
        let failCount = 0;
        for (const id of ids) {
            try {
                await restoreMutation.mutateAsync({ module: activeTab, id });
                successCount++;
            } catch {
                failCount++;
            }
        }
        setSelectedRows([]);
        if (successCount > 0) toast.success(`Khôi phục thành công ${successCount} mục.`);
        if (failCount > 0) toast.error(`Trượt ${failCount} mục khi khôi phục.`);
    };

    const handleHardDeleteIds = async (ids: string[]) => {
        if (!confirm(`CẢNH BÁO: Hành động này KHÔNG THỂ HOÀN TÁC. Xóa vĩnh viễn ${ids.length} mục đã chọn?`)) return;
        let successCount = 0;
        let failCount = 0;
        for (const id of ids) {
            try {
                await hardDeleteMutation.mutateAsync({ module: activeTab, id });
                successCount++;
            } catch {
                failCount++;
            }
        }
        setSelectedRows([]);
        if (successCount > 0) toast.success(`Đã xóa vĩnh viễn ${successCount} mục.`);
        if (failCount > 0) toast.error(`Có lỗi ở ${failCount} mục khi xóa.`);
    };

    const handleEmptyTrash = () => {
        setConfirmDialog({
            open: true,
            title: "Dọn sạch thùng rác",
            description: `Dọn sạch toàn bộ thẻ "${summary?.[activeTab]?.label}"?\nDữ liệu sẽ bị xóa vĩnh viễn. Nhập mật khẩu quản trị để xác nhận.`,
            onConfirm: () => {
                emptyTrashMutation.mutate(activeTab);
                setSelectedRows([]);
            }
        });
    };

    const handleDryRun = async () => {
        try {
            const result = await runPurge.mutateAsync(true);
            toast.success(
                `Hệ thống sẽ dọn dẹp ${result.totalPurged} dữ liệu quá hạn ở ${result.results.filter((r: any) => r.purgedCount > 0).length} phân hệ.`,
                { duration: 6000 }
            );
        } catch {
            toast.error("Lỗi khi chạy lệnh kiểm tra");
        }
    };

    const handleForcePurge = async () => {
        setConfirmDialog({
            open: true,
            title: "Dọn dẹp dữ liệu quá hạn",
            description: "CẢNH BÁO: Thao tác này sẽ XÓA VĨNH VIỄN tất cả dữ liệu đã quá thời gian lưu trữ trong thùng rác.\n\nNhập mật khẩu quản trị để xác nhận.",
            onConfirm: async () => {
                try {
                    const result = await runPurge.mutateAsync(false);
                    toast.success(`Đã xóa vĩnh viễn ${result.totalPurged} dữ liệu. Có ${result.errors.length} lỗi.`, { duration: 6000 });
                    queryClient.invalidateQueries({ queryKey: ["trash"] });
                } catch {
                    toast.error("Lỗi khi dọn dẹp dữ liệu");
                }
            }
        });
    };

    const items = itemsData?.data || [];
    const meta = itemsData?.meta;
    const totalPages = meta?.totalPages || (meta?.total ? Math.ceil(meta.total / pageSize) : 0);
    const totalCount = meta?.total || 0;

    const handleSelectAll = (checked: boolean) => {
        if (checked && items.length > 0) {
            setSelectedRows(items.map(i => i.id));
        } else {
            setSelectedRows([]);
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedRows(prev => [...prev, id]);
        } else {
            setSelectedRows(prev => prev.filter(r => r !== id));
        }
    };

    const activeModuleDef = MODULE_LIST.find(m => m.value === activeTab) || MODULE_LIST[0];
    const ActiveIcon = activeModuleDef.icon;

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            {/* ─── Header */}
            <PageHeader
                title={`Thùng rác: ${activeModuleDef.label}`}
                backHref="/settings"
                icon={
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shadow-sm ${activeModuleDef.bgClass}`}>
                        <ActiveIcon className={`h-5 w-5 sm:h-6 sm:w-6 ${activeModuleDef.iconClass}`} />
                    </div>
                }
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder={`Tìm kiếm...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10 w-[200px] lg:w-[300px] bg-background/50 border-border/60 focus:ring-slate-500"
                            />
                        </div>
                        <Button variant="outline" size="sm" className="h-10 gap-2 rounded-full px-4 border-slate-200" onClick={() => setShowConfig(v => !v)}>
                            <Settings2 className="w-4 h-4 text-slate-500" />
                            <span className="hidden lg:inline">{showConfig ? "Ẩn cấu hình" : "Cấu hình tự động dọn"}</span>
                        </Button>
                        <Button variant="outline" size="sm" className="h-10 gap-2 rounded-full px-4 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={handleDryRun} disabled={runPurge.isPending}>
                            <FlaskConical className="w-4 h-4" />
                            <span className="hidden lg:inline">Chạy thử dọn dẹp</span>
                        </Button>
                        <Button variant="outline" size="sm" className="h-10 gap-2 rounded-full px-4 text-red-600 border-red-200 hover:bg-red-50" onClick={handleForcePurge} disabled={runPurge.isPending}>
                            <Zap className="w-4 h-4" />
                            <span className="hidden lg:inline">Dọn ngay dữ liệu cũ</span>
                        </Button>
                        {!showConfig && (
                            <Button variant="default" size="sm" onClick={handleEmptyTrash} disabled={totalCount === 0 || emptyTrashMutation.isPending} className="h-10 rounded-full px-4 bg-rose-600 hover:bg-rose-700 text-white gap-2 shadow-sm">
                                <TrashIcon className="w-4 h-4" /> Dọn sạch tất cả
                            </Button>
                        )}
                    </div>
                }
            />

            {/* ─── Config Panel */}
            {showConfig && (
                <div className="flex-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <Card className="h-full border-none shadow-md ring-1 ring-blue-500/20 bg-gradient-to-br from-white to-blue-50/30 rounded-xl overflow-hidden flex flex-col">
                        <CardHeader className="pb-4 pt-5 px-6 border-b border-blue-100/50 bg-white/50 backdrop-blur-sm shrink-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-[18px] font-semibold flex items-center gap-2 text-slate-800 tracking-tight">
                                        <div className="p-2 bg-blue-100 rounded-md">
                                            <Settings2 className="h-4 w-4 text-blue-600" />
                                        </div>
                                        Cấu hình thời gian lưu trữ
                                    </CardTitle>
                                    <CardDescription className="mt-2 text-[12px] max-w-2xl text-slate-500 leading-relaxed">
                                        Hệ thống tự động chạy lúc 2:00 sáng mỗi ngày để dọn dẹp các dữ liệu quá hạn.
                                        Nhập <strong>0</strong> để vô hiệu hóa tính năng tự động xóa vĩnh viễn cho module đó.
                                    </CardDescription>
                                </div>
                                <div className="hidden md:flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50/80 border border-amber-200/50 rounded-lg px-3.5 py-2 shadow-sm">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    Tắt = Dữ liệu lưu vĩnh viễn không bị xóa
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar bg-white/40">
                            {loadingConfigs ? (
                                <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                                    <RefreshCcw className="h-6 w-6 animate-spin mb-3 text-blue-400" />
                                    <span className="text-sm font-medium">Đang tải cấu hình hệ thống...</span>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 px-2 py-1">
                                    {configs?.map(config => (
                                        <RetentionConfigRow key={config.moduleKey} config={config} />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ─── Main Two-Column Layout */}
            {!showConfig && (
                <div className="flex flex-1 gap-2 overflow-hidden">

                    {/* ── Left Sidebar */}
                    <div className="w-44 shrink-0 hidden md:flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                        <div className="px-3 h-11 border-b border-border bg-muted/30 flex items-center">
                            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <LayoutList className="w-3.5 h-3.5" />
                                Phân hệ
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                            {MODULE_LIST.map((module) => {
                                const { value, label, icon: Icon, textClass, bgLightClass, iconClass, badgeClass } = module;
                                const count = (summary as any)?.[value]?.count ?? 0;
                                const isActive = activeTab === value;
                                return (
                                    <button
                                        key={value}
                                        onClick={() => setActiveTab(value)}
                                        className={`w-full flex items-center justify-between px-2.5 py-2 text-sm rounded-lg transition-colors border ${isActive
                                            ? `${bgLightClass} ${textClass} font-medium border-l-4 pl-1.5 shadow-sm`
                                            : "hover:bg-muted text-foreground border-transparent hover:border-border pl-2.5"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? textClass : "text-muted-foreground"}`} style={{ margin: '2px' }} />
                                            <span className="truncate text-left leading-tight">{label}</span>
                                        </div>
                                        {count > 0 && (
                                            <span className={`ml-1 text-[10px] font-medium min-w-[18px] text-center px-1 py-0.5 rounded-full shrink-0 ${isActive ? badgeClass : "bg-muted-foreground/15 text-muted-foreground"
                                                }`}>
                                                {count > 99 ? '99+' : count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Right Panel */}
                    <div className="flex-1 flex flex-col overflow-hidden gap-2 min-w-0">


                        {/* Table Card */}
                        <div className="rounded-xl border border-border bg-card shadow-sm flex-1 flex flex-col overflow-hidden">

                            {/* Table */}
                            <div className="flex-1 overflow-auto relative custom-scrollbar">
                                {loadingItems && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-20">
                                        <RefreshCcw className="h-6 w-6 animate-spin mb-2 text-blue-500" />
                                        <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
                                    </div>
                                )}
                                <Table className="relative w-max min-w-full">
                                    <TableHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50 z-10">
                                        <TableRow className="hover:bg-transparent border-none">
                                            {/* Checkbox */}
                                            <TableHead className="w-[44px] border-r border-border/40">
                                                <Checkbox checked={items.length > 0 && selectedRows.length === items.length} onCheckedChange={(c) => handleSelectAll(c as boolean)} className="mt-0.5" />
                                            </TableHead>
                                            {TRASH_COLUMNS.map((col) => (
                                                <TableHead
                                                    key={col.key}
                                                    style={{
                                                        width: `var(--trash-col-w-${col.key}, auto)`,
                                                        minWidth: `var(--trash-col-w-${col.key}, max-content)`,
                                                        maxWidth: `var(--trash-col-w-${col.key}, auto)`,
                                                    }}
                                                    className={`overflow-hidden ${col.sortable ? "cursor-pointer hover:text-foreground transition-colors" : ""} relative select-none border-r border-border/40 last:border-r-0 group`}
                                                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                                                >
                                                    <div className="flex items-center pl-0 h-full w-full">
                                                        <div className="flex items-center min-w-0 flex-1 pr-4">
                                                            <span className="truncate flex-1" title={col.label}>{col.label}</span>
                                                            {col.sortable && <SortIcon field={col.key} />}
                                                        </div>
                                                        {/* Resize handle */}
                                                        <span
                                                            className="absolute right-0 top-0 h-full w-4 cursor-col-resize flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                            onMouseDown={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                const th = (e.currentTarget as HTMLElement).closest('th')!;
                                                                const startX = e.clientX;
                                                                const startW = th.getBoundingClientRect().width;
                                                                const onMove = (ev: MouseEvent) => {
                                                                    const newW = Math.max(60, startW + ev.clientX - startX);
                                                                    document.documentElement.style.setProperty(`--trash-col-w-${col.key}`, `${newW}px`);
                                                                };
                                                                const onUp = (ev: MouseEvent) => {
                                                                    window.removeEventListener('mousemove', onMove);
                                                                    window.removeEventListener('mouseup', onUp);
                                                                    const finalW = Math.max(60, startW + ev.clientX - startX);
                                                                    saveColWidth(col.key, finalW);
                                                                };
                                                                window.addEventListener('mousemove', onMove);
                                                                window.addEventListener('mouseup', onUp);
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <span className="w-[3px] h-5 bg-border rounded-full hover:bg-blue-500 transition-colors" />
                                                        </span>
                                                    </div>
                                                </TableHead>
                                            ))}
                                            {/* Actions col */}
                                            <TableHead className="w-[60px] border-l border-border/40"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 && !loadingItems ? (
                                            <TableRow>
                                                <TableCell colSpan={TRASH_COLUMNS.length + 2} className="text-center py-20">
                                                    <div className="flex flex-col items-center justify-center text-muted-foreground/60">
                                                        <TrashIcon className="h-12 w-12 mb-3 text-muted-foreground/30" />
                                                        <p className="text-base font-medium text-muted-foreground">Thùng rác trống</p>
                                                        <p className="text-sm mt-1">Không có dữ liệu đã xóa trong phân hệ này.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            items.map((item) => {
                                                const deletedDate = new Date(item.deletedAt);
                                                const expiryDate = new Date(deletedDate);
                                                expiryDate.setDate(expiryDate.getDate() + retentionDays);
                                                const diffDays = retentionDays > 0 ? Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : null;
                                                const isExpiringSoon = diffDays !== null && diffDays <= 5;
                                                const isSelected = selectedRows.includes(item.id);
                                                return (
                                                    <TableRow key={item.id} data-state={isSelected && "selected"} className="group cursor-default">
                                                        <TableCell className="border-r border-border/20" onClick={(e) => e.stopPropagation()}>
                                                            <Checkbox checked={isSelected} onCheckedChange={(c) => handleSelectRow(item.id, c as boolean)} />
                                                        </TableCell>
                                                        {/* Name */}
                                                        <TableCell className="overflow-hidden text-ellipsis border-r border-border/20"
                                                            style={{ width: `var(--trash-col-w-name, auto)`, maxWidth: `var(--trash-col-w-name, auto)` }}>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-semibold text-foreground whitespace-nowrap" title={item.name}>{item.name}</span>
                                                                {item.deletedBatchId && <Badge variant="outline" className="text-[10px] px-1.5 h-4 w-fit">Xóa theo nhóm</Badge>}
                                                            </div>
                                                        </TableCell>
                                                        {/* Code */}
                                                        <TableCell className="overflow-hidden text-ellipsis border-r border-border/20"
                                                            style={{ width: `var(--trash-col-w-code, auto)`, maxWidth: `var(--trash-col-w-code, auto)` }}>
                                                            <span className="font-mono text-sm text-muted-foreground whitespace-nowrap">{item.code || "—"}</span>
                                                        </TableCell>
                                                        {/* Extra info */}
                                                        <TableCell className="overflow-hidden text-ellipsis border-r border-border/20"
                                                            style={{ width: `var(--trash-col-w-extraInfo, auto)`, maxWidth: `var(--trash-col-w-extraInfo, auto)` }}>
                                                            <span className="text-sm text-muted-foreground whitespace-nowrap">{item.extraInfo || "—"}</span>
                                                        </TableCell>
                                                        {/* Deleted at */}
                                                        <TableCell className="overflow-hidden text-ellipsis border-r border-border/20"
                                                            style={{ width: `var(--trash-col-w-deletedAt, auto)`, maxWidth: `var(--trash-col-w-deletedAt, auto)` }}>
                                                            <span className="text-sm text-foreground whitespace-nowrap">{format(deletedDate, "dd/MM/yyyy HH:mm", { locale: vi })}</span>
                                                        </TableCell>
                                                        {/* Deleted by */}
                                                        <TableCell className="overflow-hidden text-ellipsis border-r border-border/20"
                                                            style={{ width: `var(--trash-col-w-deletedBy, auto)`, maxWidth: `var(--trash-col-w-deletedBy, auto)` }}>
                                                            <span className="text-sm font-medium text-foreground whitespace-nowrap">{item.deletedBy}</span>
                                                        </TableCell>
                                                        {/* Expiry */}
                                                        <TableCell className="overflow-hidden text-ellipsis border-r border-border/20"
                                                            style={{ width: `var(--trash-col-w-expiry, auto)`, maxWidth: `var(--trash-col-w-expiry, auto)` }}>
                                                            {diffDays === null ? (
                                                                <Badge variant="outline" className="border-0 rounded-full px-3 py-1 font-medium bg-emerald-500/15 text-emerald-700">
                                                                    <div className="w-1.5 h-1.5 rounded-full mr-1.5 bg-emerald-500 inline-block"></div>Vĩnh viễn
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className={`border-0 rounded-full px-3 py-1 font-medium ${isExpiringSoon ? "bg-rose-500/15 text-rose-700 animate-pulse" : "bg-amber-500/15 text-amber-700"}`}>
                                                                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${isExpiringSoon ? "bg-rose-500" : "bg-amber-500"}`}></div>
                                                                    {diffDays > 0 ? `${diffDays} ngày` : "Hôm nay"}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        {/* Actions */}
                                                        <TableCell className="text-right py-3 pr-4">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-[160px] border-border shadow-lg">
                                                                    <DropdownMenuItem onClick={() => setPreviewItem(item)} className="cursor-pointer py-2.5">
                                                                        <Eye className="mr-2 h-4 w-4 text-blue-600" />Xem chi tiết
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => item.deletedBatchId ? handleRestoreGroup(item) : handleRestoreIds([item.id])} className="cursor-pointer py-2.5">
                                                                        <RefreshCcw className="mr-2 h-4 w-4 text-emerald-600" />Khôi phục
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => handleHardDeleteIds([item.id])} className="cursor-pointer text-destructive focus:text-destructive py-2.5">
                                                                        <Trash2 className="mr-2 h-4 w-4" />Xóa vĩnh viễn
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Footer — matches employees module exactly */}
                            <div className="flex items-center justify-between mt-auto bg-card p-2 rounded-b-xl border-t border-border">
                                {selectedRows.length > 0 ? (
                                    <div className="flex items-center gap-3 bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20 animate-in fade-in slide-in-from-bottom-2">
                                        <span className="text-sm text-indigo-700 dark:text-indigo-400 font-semibold shadow-sm">Đã chọn ({selectedRows.length})</span>
                                        <Button size="sm" variant="ghost" onClick={() => setSelectedRows([])} className="h-8 rounded-md text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 px-3">
                                            Bỏ chọn
                                        </Button>
                                        <Button size="sm" variant="default" onClick={() => handleRestoreIds(selectedRows)} className="shadow-sm hover:shadow h-8 rounded-md bg-emerald-600 hover:bg-emerald-700">
                                            <ArchiveRestore className="mr-2 h-3.5 w-3.5" /> Khôi phục
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleHardDeleteIds(selectedRows)} className="shadow-sm hover:shadow h-8 rounded-md bg-rose-500 hover:bg-rose-600">
                                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Xóa vĩnh viễn
                                        </Button>
                                    </div>
                                ) : null}
                                <div className={selectedRows.length > 0 ? "" : "ml-auto"}>
                                    <PaginationControl
                                        currentPage={page}
                                        totalPages={totalPages}
                                        pageSize={pageSize}
                                        totalCount={totalCount}
                                        onPageChange={setPage}
                                        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <PasswordConfirmDialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog(p => ({ ...p, open }))}
                title={confirmDialog.title}
                description={confirmDialog.description}
                onConfirm={confirmDialog.onConfirm}
                isLoading={hardDeleteMutation.isPending || emptyTrashMutation.isPending || runPurge.isPending}
            />

            {/* Audit Preview Dialog */}
            <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden font-sans">
                    <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30 shrink-0">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Eye className="w-5 h-5 text-blue-500" />
                            Truy vết dữ liệu (Audit Trail)
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            Hồ sơ dữ liệu được ghi nhận vào đúng thời điểm bị xóa ({previewItem && format(new Date(previewItem.deletedAt), "dd/MM/yyyy HH:mm")})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden flex flex-col bg-background">
                        {loadingPreview ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <RefreshCcw className="w-6 h-6 animate-spin mb-4" />
                                <span className="text-sm">Đang truy xuất dữ liệu nguyên thủy...</span>
                            </div>
                        ) : previewData ? (
                            <Tabs defaultValue="readable" className="flex-1 flex flex-col overflow-hidden">
                                <div className="px-6 pt-3 border-b border-border bg-card">
                                    <TabsList className="mb-[-1px] max-w-fit rounded-lg shadow-sm ring-1 ring-border/50 p-1">
                                        <TabsTrigger value="readable" className="gap-2 px-4 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                                            <Info className="w-4 h-4" /> Dễ đọc
                                        </TabsTrigger>
                                        <TabsTrigger value="raw" className="gap-2 px-4 py-1.5 rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm">
                                            <Code2 className="w-4 h-4" /> Mã thô (Raw JSON)
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50">
                                    <TabsContent value="readable" className="m-0 focus-visible:outline-none space-y-6">
                                        {/* Cascade Delete Warning */}
                                        {previewData.deletedBatchId && (
                                            <div className="relative overflow-hidden flex items-start gap-4 p-5 sm:p-6 bg-gradient-to-r from-amber-50/80 to-transparent border border-amber-200/50 rounded-2xl shadow-sm ring-1 ring-amber-500/5">
                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400/90 rounded-l-2xl" />
                                                <div className="bg-white p-2.5 rounded-full shrink-0 shadow-sm border border-amber-100">
                                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                                </div>
                                                <div className="text-[12px] leading-relaxed text-amber-900/80 flex-1">
                                                    <p className="text-[14px] font-semibold text-amber-950 mb-1.5 tracking-tight">Cảnh báo: Dữ liệu này bị xóa theo dây chuyền (Cascade Delete)</p>
                                                    <p className="mb-3">Bản ghi này không bị xóa trực tiếp. Việc nó nằm trong thùng rác là hệ quả tự động của thao tác <b className="font-semibold text-amber-950">xóa lô dữ liệu cấp trên</b>.</p>

                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-1">
                                                        <span className="flex items-center gap-2 bg-white border border-amber-200/60 font-mono px-3 py-1.5 rounded-lg text-[13px] font-semibold shadow-sm text-slate-700">
                                                            <span className="text-amber-500/70 font-sans text-[11px] uppercase tracking-wider font-semibold">Mã Lô </span> {previewData.deletedBatchId}
                                                        </span>
                                                        <span className="font-medium inline-flex items-center gap-1.5 bg-amber-100/50 px-3 py-1.5 rounded-lg border border-amber-200/40 text-amber-800">
                                                            <Info className="w-4 h-4 shrink-0 text-amber-600" /> Nên khôi phục để bảo toàn vẹn dữ liệu gốc.
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm ring-1 ring-slate-900/5 overflow-hidden">
                                            {/* Header of table */}
                                            <div className="grid grid-cols-3 md:grid-cols-4 px-4 md:px-5 py-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 font-semibold uppercase text-slate-600 dark:text-slate-400 tracking-wider" style={{ fontSize: "11px" }}>
                                                <div className="col-span-1">Trường dữ liệu</div>
                                                <div className="col-span-2 md:col-span-3 pl-2">Giá trị lưu trữ</div>
                                            </div>
                                            {/* Data rows */}
                                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                                {Object.entries(previewData).map(([key, value], idx) => {
                                                    //... (System fields skipped)
                                                    if (['deletedAt', 'deletedById', 'deletedBatchId'].includes(key)) return null;

                                                    // Translate common keys
                                                    const keyLabels: Record<string, string> = {
                                                        id: "Mã Quản lý Gốc (ID)",
                                                        code: "Mã Định Danh (Code)",
                                                        name: "Tên / Danh xưng",
                                                        title: "Tiêu đề",
                                                        fullName: "Họ và tên",
                                                        username: "Tên đăng nhập",
                                                        status: "Trạng thái hoạt động",
                                                        type: "Phân loại",
                                                        note: "Ghi chú",
                                                        address: "Địa chỉ",
                                                        createdAt: "Ngày tạo",
                                                        updatedAt: "Ngày cập nhật",
                                                        createdById: "Người tạo (ID)",
                                                        updatedById: "Người sửa (ID)",
                                                    };

                                                    const displayLabel = keyLabels[key] || key;
                                                    let displayValue: React.ReactNode = String(value);

                                                    if (value === null || value === undefined || value === "") {
                                                        displayValue = <span className="text-slate-400 italic text-[14px]">Trống (null)</span>;
                                                    } else if (typeof value === 'boolean') {
                                                        displayValue = <Badge variant={value ? "default" : "secondary"} className="shadow-sm font-medium px-2.5 py-0.5">{value ? "Có (True)" : "Không (False)"}</Badge>;
                                                    } else if (key.toLowerCase().includes('at') && typeof value === 'string' && value.includes('T')) {
                                                        try {
                                                            displayValue = <span className="text-slate-600 dark:text-slate-300 font-mono text-[13px] bg-slate-50 border border-slate-200/60 dark:bg-slate-800 px-2.5 py-1 rounded-md shadow-sm">{format(new Date(value as string), "dd/MM/yyyy HH:mm:ss", { locale: vi })}</span>;
                                                        } catch { }
                                                    } else if (key === 'status') {
                                                        const isAct = value === 'ACTIVE' || value === 1 || value === true;
                                                        displayValue = <span className={`inline-flex items-center gap-1.5 font-semibold text-[13px] px-2.5 py-1 rounded-md border shadow-sm ${isAct ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-slate-50 text-slate-600 border-slate-200/80"}`}><div className={`w-1.5 h-1.5 rounded-full ${isAct ? "bg-emerald-500" : "bg-slate-400"}`}></div>{String(value)}</span>;
                                                    } else if (key === 'id' || key.toLowerCase().includes('id')) {
                                                        displayValue = <span className="text-blue-600 dark:text-blue-400 font-mono text-[13px] bg-blue-50/50 border border-blue-100/50 dark:bg-blue-500/10 px-2.5 py-1 rounded-md">{String(value)}</span>;
                                                    } else if (typeof value === 'string') {
                                                        const isMainLabel = ['name', 'title', 'fullName'].includes(key);
                                                        displayValue = <span className={`break-words leading-relaxed ${isMainLabel ? 'text-[15px] font-semibold text-slate-900 border-b border-dashed border-slate-300 pb-0.5' : 'text-[14px] text-slate-700 dark:text-slate-200'}`}>{value}</span>;
                                                    }

                                                    return (
                                                        <div key={key} className={`grid grid-cols-3 md:grid-cols-4 px-4 md:px-5 py-2.5 lg:py-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group ${idx === 0 ? 'rounded-t-2xl' : ''}`}>
                                                            <div className="col-span-1 flex flex-col justify-center pr-4">
                                                                <span className="text-[13px] font-medium text-slate-500/90 dark:text-slate-400">{displayLabel}</span>
                                                                {displayLabel !== key && <span className="text-[11px] text-slate-400/70 dark:text-slate-500 font-mono mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity leading-none">{key}</span>}
                                                            </div>
                                                            <div className="col-span-2 md:col-span-3 text-[14px] text-slate-900 dark:text-slate-100 flex items-center pl-2 font-medium">
                                                                {displayValue}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="raw" className="m-0 focus-visible:outline-none h-full">
                                        <div className="bg-slate-950 rounded-xl p-4 overflow-auto border border-slate-800 shadow-inner h-full min-h-[400px]">
                                            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                                                <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                                                    <FileJson className="w-3.5 h-3.5" />
                                                    Dữ liệu JSON gốc xuất từ Database
                                                </div>
                                            </div>
                                            <pre className="text-[13px] font-mono leading-relaxed text-emerald-400 whitespace-pre-wrap break-words">
                                                {JSON.stringify(previewData, null, 2)}
                                            </pre>
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        ) : (
                            <div className="flex-1 flex items-center justify-center py-20 text-slate-500">
                                Lỗi: Không thể tải bản ghi gốc. Có thể dữ liệu đã bị dọn dẹp khỏi database.
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-border bg-muted/20 shrink-0 flex items-center justify-between">
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Info className="w-3.5 h-3.5" /> Action này được lưu vết tự động.
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setPreviewItem(null)}>Thoát</Button>
                            <Button
                                variant="default"
                                className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                                onClick={() => {
                                    if (previewItem) {
                                        if (previewItem.deletedBatchId) handleRestoreGroup(previewItem);
                                        else handleRestoreIds([previewItem.id]);
                                        setPreviewItem(null);
                                    }
                                }}
                            >
                                <ArchiveRestore className="w-4 h-4 mr-2" /> Khôi phục mục này
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
