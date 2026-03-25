"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Activity, Loader2, Search, Eye, Calendar, ArrowUpDown, ChevronUp, ChevronDown, FileDown, Upload, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import { getAccessToken } from "@/lib/api-client";
import { AuditStatsCard } from "@/components/audit/audit-stats-widgets";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControl } from "@/components/ui/pagination-control";
import { SearchBar } from "@/components/ui/search-bar";
import { useAuth } from "@/contexts/auth-context";
import { PermissionGate } from "@/components/auth/permission-gate";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";
import { useTableColumns, ColumnDef } from "@/hooks/use-table-columns";
import { Columns3, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const AUDIT_DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "createdAt", label: "Thời gian" },
    { key: "actor", label: "Người thực hiện" },
    { key: "action", label: "Hành động" },
    { key: "entityType", label: "Đối tượng" },
    { key: "changes", label: "Chi tiết thay đổi" },
    { key: "ipInfo", label: "Máy / IP", defaultVisible: false },
];

interface AuditLog {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    ip?: string;
    userAgent?: string;
    computerName?: string;
    beforeJson?: any;
    afterJson?: any;
    actor?: { id: string; username: string; email: string };
}

const actionColors: Record<string, string> = {
    CREATE: "bg-green-100 text-green-800",
    UPDATE: "bg-blue-100 text-blue-800",
    DELETE: "bg-red-100 text-red-800",
    LOGIN: "bg-purple-100 text-purple-800",
    LOGOUT: "bg-gray-100 text-gray-800",
    APPROVE: "bg-emerald-100 text-emerald-800",
    REJECT: "bg-rose-100 text-rose-800",
    CANCEL: "bg-orange-100 text-orange-800",
};

const ACTION_TRANSLATIONS: Record<string, string> = {
    'CREATE': 'Tạo mới',
    'UPDATE': 'Cập nhật',
    'DELETE': 'Xóa',
    'LOGIN': 'Đăng nhập',
    'LOGOUT': 'Đăng xuất',
    'APPROVE': 'Phê duyệt',
    'REJECT': 'Từ chối',
    'CANCEL': 'Hủy',
    'READ': 'Xem',
    'VIEW_SENSITIVE': 'Xem dữ liệu nhạy cảm'
};

const ENTITY_TRANSLATIONS: Record<string, string> = {
    'User': 'Người dùng',
    'Role': 'Vai trò',
    'Department': 'Phòng ban',
    'Employee': 'Nhân viên',
    'MeetingRoom': 'Phòng họp',
    'RoomBooking': 'Đặt phòng',
    'Booking': 'Đặt phòng',
    'Car': 'Xe',
    'CarBooking': 'Đặt xe',
    'News': 'Tin tức',
    'Task': 'Công việc',
    'Project': 'Dự án',
    'KPI': 'KPI',
    'Request': 'Tờ trình / Đề xuất',
    'Document': 'Tài liệu',
    'Shift': 'Ca làm việc',
    'Attendance': 'Chấm công',
    'LeaveRequest': 'Yêu cầu nghỉ phép',
    'OvertimeRequest': 'Yêu cầu làm thêm giờ',
};

const ACTION_OPTIONS: Option[] = [
    { label: "Tạo mới (CREATE)", value: "CREATE" },
    { label: "Cập nhật (UPDATE)", value: "UPDATE" },
    { label: "Xóa (DELETE)", value: "DELETE" },
    { label: "Đăng nhập (LOGIN)", value: "LOGIN" },
    { label: "Đăng xuất (LOGOUT)", value: "LOGOUT" },
    { label: "Phê duyệt (APPROVE)", value: "APPROVE" },
    { label: "Từ chối (REJECT)", value: "REJECT" },
];

const renderDiffInTable = (log: AuditLog) => {
    if (log.action === 'CREATE') return <span className="text-green-600">Tạo mới dữ liệu</span>;
    if (log.action === 'DELETE') return <span className="text-red-600">Xóa dữ liệu</span>;
    if (log.action === 'LOGIN') return <span>Đăng nhập hệ thống</span>;
    if (log.action === 'LOGOUT') return <span>Đăng xuất</span>;

    if (!log.beforeJson || !log.afterJson) {
        return <span className="text-gray-400 italic text-xs">Xem chi tiết</span>;
    }

    const changes = [];
    const allKeys = new Set([...Object.keys(log.beforeJson || {}), ...Object.keys(log.afterJson || {})]);

    const translateKey = (key: string) => {
        const map: Record<string, string> = {
            name: "Tên",
            title: "Tiêu đề",
            description: "Mô tả",
            content: "Nội dung",
            status: "Trạng thái",
            color: "Màu sắc",
            capacity: "Sức chứa",
            location: "Vị trí",
            startTime: "Bắt đầu",
            endTime: "Kết thúc",
            startDatetime: "Bắt đầu",
            endDatetime: "Kết thúc",
            equipmentsJson: "Thiết bị",
            image: "Hình ảnh",
            code: "Mã",
            username: "Tên đăng nhập",
            email: "Email",
            fullName: "Họ và tên",
        };
        return map[key] || key;
    };

    let count = 0;
    for (const key of Array.from(allKeys)) {
        if (['createdAt', 'updatedAt', 'updatedBy', 'createdBy', 'passwordHash', 'id', 'lastLoginAt', 'organizerEmployeeId', 'roomId'].includes(key)) continue;
        const v1 = JSON.stringify(log.beforeJson?.[key] || '');
        const v2 = JSON.stringify(log.afterJson?.[key] || '');

        if (v1 !== v2) {
            const cleanV1 = v1.replace(/^"|"$/g, '');
            const cleanV2 = v2.replace(/^"|"$/g, '');

            let displayV1 = cleanV1.length > 15 ? cleanV1.substring(0, 15) + '...' : cleanV1;
            let displayV2 = cleanV2.length > 15 ? cleanV2.substring(0, 15) + '...' : cleanV2;
            if (cleanV1 === '""' || cleanV1 === '') displayV1 = '(trống)';
            if (cleanV2 === '""' || cleanV2 === '') displayV2 = '(trống)';

            changes.push(
                <div key={key} className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                    <span className="font-semibold text-gray-600">{translateKey(key)}:</span>
                    <span className="text-red-500 line-through decoration-red-500/50">{displayV1}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-green-600 font-medium">{displayV2}</span>
                </div>
            );
            count++;
            if (count >= 3) break;
        }
    }

    if (changes.length === 0) return <span className="text-gray-400 italic text-xs">Không có thay đổi đáng kể</span>;

    return (
        <div className="flex flex-col gap-0.5">
            {changes}
            {count >= 3 && <span className="text-[10px] text-muted-foreground">... và thêm thay đổi khác</span>}
        </div>
    );
};

export default function AuditPage() {
    const { checkPermission } = useAuth();
    const hasViewPermission = checkPermission("AUDITLOG_VIEW");

    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState<string[]>([]);
    const [entityFilter, setEntityFilter] = useState<string[]>([]);
    const [sort, setSort] = useState<{ sortBy: string; order: "asc" | "desc" }>({ sortBy: "createdAt", order: "desc" });
    const [detailLog, setDetailLog] = useState<AuditLog | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
    const { visibleColumns, allColumns } = useTableColumns("audit", AUDIT_DEFAULT_COLUMNS);

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const { data: logsData, isLoading } = useQuery({
        queryKey: ["audit-logs", search, actionFilter, entityFilter, sort, page, pageSize],
        queryFn: () => {
            const params = new URLSearchParams();
            params.append("page", page.toString());
            params.append("limit", pageSize.toString());
            if (search) params.append("search", search);
            if (actionFilter.length > 0) params.append("action", actionFilter.join(","));
            if (entityFilter.length > 0) params.append("entityType", entityFilter.join(","));
            params.append("sortBy", sort.sortBy);
            params.append("order", sort.order);

            return apiGet<{ data: AuditLog[]; meta: any }>(`/audit-logs?${params.toString()}`);
        },
    });

    const logs = logsData?.data || [];
    const meta = logsData?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

    const entityTypes = [...new Set(logs.map((l) => l.entityType))];
    const knownEntityTypes = Object.keys(ENTITY_TRANSLATIONS);
    const allEntityTypes = Array.from(new Set([...entityTypes, ...knownEntityTypes]));
    const entityOptions: Option[] = allEntityTypes.map(t => ({
        label: ENTITY_TRANSLATIONS[t] || t,
        value: t
    }));

    const toggleSort = (field: string) => {
        setSort(prev => ({
            sortBy: field,
            order: prev.sortBy === field && prev.order === "asc" ? "desc" : "asc"
        }));
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sort?.sortBy !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:bg-muted/50 rounded" />;
        return sort.order === "asc"
            ? <ChevronUp className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />
            : <ChevronDown className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />;
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const token = getAccessToken();
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            if (actionFilter.length > 0) params.append("action", actionFilter.join(","));
            if (entityFilter.length > 0) params.append("entityType", entityFilter.join(","));
            params.append("sortBy", sort.sortBy);
            params.append("order", sort.order);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/audit-logs/export/excel?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error("Xuất file thất bại");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Export_Lichsuhethong.xlsx";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Lỗi xuất Excel");
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = () => toast.info("Tính năng Nhập Excel đang được phát triển...");
    const handleAdd = () => toast.info("Hệ thống nhật ký tự động ghi lại, không hỗ trợ thêm thủ công.");

    if (!hasViewPermission) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Activity className="h-12 w-12 text-muted-foreground/50" />
                <h2 className="text-xl font-semibold">Quyền truy cập bị hạn chế</h2>
                <p className="text-muted-foreground text-center max-w-md">
                    Bạn không có quyền xem nhật ký hệ thống. Vui lòng liên hệ quản trị viên để được cấp quyền `AUDITLOG_VIEW`.
                </p>
                <Button variant="outline" onClick={() => window.history.back()}>Quay lại</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <PageHeader
                    title="NHẬT KÝ HỆ THỐNG"
                    icon={
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-teal-500 to-teal-700">
                            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                        </div>
                    }
                    className="mb-0 border-none bg-transparent p-0 shadow-none"
                    search={
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <SearchBar
                                    placeholder="Tìm kiếm..."
                                    value={search}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    }
                >
                <Button className="h-10 shadow-md" onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" /> Thêm mới
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-10">
                            <MoreHorizontal className="mr-2 h-4 w-4" />
                            Tùy chọn
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                        <PermissionGate permission="EXPORT_DATA">
                            <DropdownMenuItem onClick={handleExport} disabled={isExporting} className="py-2.5 cursor-pointer">
                                <FileDown className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Xuất dữ liệu Excel</span>
                            </DropdownMenuItem>
                        </PermissionGate>
                        <PermissionGate permission="IMPORT_DATA">
                            <DropdownMenuItem onClick={handleImport} className="py-2.5 cursor-pointer">
                                <Upload className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span>Nhập dữ liệu Excel</span>
                            </DropdownMenuItem>
                        </PermissionGate>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsColumnConfigOpen(true)} className="py-2.5 cursor-pointer">
                            <Columns3 className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>Sắp xếp cột</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </PageHeader>
            </div>

            <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto pr-1 pb-4">
            <AuditStatsCard
                title="Thống kê hoạt động"
                description="Phân tích các thao tác trong 7 ngày gần đây"
            />

            <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-lg border">
                <span className="text-sm font-medium text-muted-foreground">Bộ lọc:</span>
                <div className="w-[200px]">
                    <MultiSelect
                        options={ACTION_OPTIONS}
                        selected={actionFilter}
                        onChange={setActionFilter}
                        placeholder="Hành động"
                    />
                </div>
                <div className="w-[200px]">
                    <MultiSelect
                        options={entityOptions}
                        selected={entityFilter}
                        onChange={setEntityFilter}
                        placeholder="Đối tượng"
                    />
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                        <TableRow className="hover:bg-transparent border-none">
                            {visibleColumns.map(col => {
                                const sortMap: Record<string, string> = { createdAt: "createdAt", actor: "actor.username", action: "action", entityType: "entityType" };
                                const sortField = sortMap[col.key];
                                return (
                                    <TableHead key={col.key}
                                        className={`h-10 font-medium ${col.key === 'ipInfo' ? 'hidden md:table-cell' : ''} ${sortField ? 'cursor-pointer hover:bg-muted/80 transition-colors group' : ''}`}
                                        onClick={sortField ? () => toggleSort(sortField) : undefined}>
                                        <div className="flex items-center">
                                            {col.label}
                                            {sortField && <SortIcon field={sortField} />}
                                        </div>
                                    </TableHead>
                                );
                            })}
                            <TableHead className="h-10 font-medium text-right">Chi tiết</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                                    Không có log nào
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    {visibleColumns.map(col => {
                                        const renderers: Record<string, () => React.ReactNode> = {
                                            createdAt: () => <div className="flex items-center gap-1 text-nowrap text-sm"><Calendar className="h-3 w-3 text-muted-foreground" />{format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}</div>,
                                            actor: () => log.actor ? <div className="flex flex-col"><span className="font-medium text-sm">{log.actor.username}</span><span className="text-xs text-muted-foreground">{log.actor.email}</span></div> : <span className="text-muted-foreground">System</span>,
                                            action: () => <Badge className={actionColors[log.action] || "bg-gray-100"}>{ACTION_TRANSLATIONS[log.action] || log.action}</Badge>,
                                            entityType: () => <div className="flex flex-col"><Badge variant="outline" className="w-fit mb-1">{ENTITY_TRANSLATIONS[log.entityType] || log.entityType}</Badge><span className="text-xs text-muted-foreground truncate max-w-[150px]" title={log.entityId}>ID: {log.entityId.substring(0, 8)}...</span></div>,
                                            changes: () => <div className="max-w-[400px]">{renderDiffInTable(log)}</div>,
                                            ipInfo: () => <div className="flex flex-col text-xs">{log.computerName && log.computerName !== log.ip ? <><span className="font-medium truncate" title={log.computerName}>{log.computerName}</span><span className="text-muted-foreground">{log.ip}</span></> : <span>{log.ip || '-'}</span>}</div>,
                                        };
                                        const render = renderers[col.key];
                                        return <TableCell key={col.key} className={col.key === 'ipInfo' ? 'hidden md:table-cell max-w-[150px]' : ''}>{render ? render() : '—'}</TableCell>;
                                    })}
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => setDetailLog(log)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end">
                <PaginationControl
                    currentPage={page}
                    totalPages={meta.totalPages || 1}
                    pageSize={pageSize}
                    totalCount={meta.total || 0}
                    onPageChange={setPage}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setPage(1);
                    }}
                />
            </div>

            <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Chi tiết Log</DialogTitle>
                    </DialogHeader>
                    {detailLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label className="text-muted-foreground">Thời gian</Label>
                                    <p>{format(new Date(detailLog.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Người thực hiện</Label>
                                    <p>{detailLog.actor?.username || "System"}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Hành động</Label>
                                    <Badge className={actionColors[detailLog.action]}>{ACTION_TRANSLATIONS[detailLog.action] || detailLog.action}</Badge>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Đối tượng</Label>
                                    <p>
                                        {ENTITY_TRANSLATIONS[detailLog.entityType] || detailLog.entityType} ({detailLog.entityId})
                                    </p>
                                </div>
                                {detailLog.ip && (
                                    <div>
                                        <Label className="text-muted-foreground">IP</Label>
                                        <p>{detailLog.ip}</p>
                                    </div>
                                )}
                                {detailLog.computerName && (
                                    <div>
                                        <Label className="text-muted-foreground">Tên máy (Computer Name)</Label>
                                        <p>{detailLog.computerName}</p>
                                    </div>
                                )}
                                {detailLog.userAgent && (
                                    <div className="col-span-2">
                                        <Label className="text-muted-foreground">User Agent</Label>
                                        <p className="text-xs break-all">{detailLog.userAgent}</p>
                                    </div>
                                )}
                            </div>

                            {(() => {
                                if (detailLog.action === 'UPDATE' && detailLog.beforeJson && detailLog.afterJson) {
                                    const changes = [];
                                    const allKeys = new Set([...Object.keys(detailLog.beforeJson), ...Object.keys(detailLog.afterJson)]);
                                    for (const key of Array.from(allKeys)) {
                                        if (['createdAt', 'updatedAt', 'updatedBy', 'createdBy', 'passwordHash', 'id', 'lastLoginAt'].includes(key)) continue;
                                        const v1 = JSON.stringify(detailLog.beforeJson[key] || '');
                                        const v2 = JSON.stringify(detailLog.afterJson[key] || '');
                                        if (v1 !== v2) {
                                            changes.push({ key, from: v1.replace(/"/g, ''), to: v2.replace(/"/g, '') });
                                        }
                                    }

                                    if (changes.length > 0) {
                                        return (
                                            <div>
                                                <Label className="text-muted-foreground mb-2 block">Các thay đổi</Label>
                                                <div className="bg-muted p-3 rounded text-sm space-y-2">
                                                    {changes.map((change, idx) => (
                                                        <div key={idx} className="grid grid-cols-[120px_1fr] gap-2 border-b last:border-0 pb-1 last:pb-0 border-white/20">
                                                            <span className="font-semibold text-muted-foreground">{change.key}:</span>
                                                            <span className="break-all">
                                                                <span className="line-through text-red-500 mr-2">{change.from}</span>
                                                                <span className="text-green-600">→ {change.to}</span>
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }
                                }
                                return null;
                            })()}

                            {detailLog.beforeJson && detailLog.action !== 'UPDATE' && (
                                <div>
                                    <Label className="text-muted-foreground">Dữ liệu gốc (Trước khi xóa)</Label>
                                    <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-x-auto">
                                        {JSON.stringify(detailLog.beforeJson, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {detailLog.afterJson && detailLog.action !== 'UPDATE' && (
                                <div>
                                    <Label className="text-muted-foreground">Dữ liệu mới (Sau khi tạo)</Label>
                                    <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-x-auto">
                                        {JSON.stringify(detailLog.afterJson, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {detailLog.action === 'UPDATE' && (
                                <details className="text-xs text-muted-foreground cursor-pointer">
                                    <summary>Xem dữ liệu thô (Raw JSON)</summary>
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <pre className="p-2 bg-muted rounded overflow-auto max-h-40">{JSON.stringify(detailLog.beforeJson, null, 2)}</pre>
                                        <pre className="p-2 bg-muted rounded overflow-auto max-h-40">{JSON.stringify(detailLog.afterJson, null, 2)}</pre>
                                    </div>
                                </details>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <ColumnConfigDialog
                open={isColumnConfigOpen}
                onOpenChange={setIsColumnConfigOpen}
                moduleKey="audit"
                allColumns={allColumns}
                defaultColumns={AUDIT_DEFAULT_COLUMNS}
            />
            </div>
        </div>
    );
}
