"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { AuditLog } from "@/services/audit.service";
import {
    Activity,
    PlusCircle,
    Pencil,
    Trash2,
    LogIn,
    LogOut,
    FileInput,
    FileOutput,
    ArrowUpDown,
    ChevronUp,
    ChevronDown
} from "lucide-react";

interface AuditTableProps {
    data: AuditLog[];
    isLoading: boolean;
    sort?: { sortBy: string; order: "asc" | "desc" };
    onSort?: (field: string) => void;
}

const getActionIcon = (action: string) => {
    switch (action) {
        case "CREATE": return <PlusCircle className="h-4 w-4 text-green-600" />;
        case "UPDATE": return <Pencil className="h-4 w-4 text-orange-600" />;
        case "DELETE": return <Trash2 className="h-4 w-4 text-red-600" />;
        case "LOGIN": return <LogIn className="h-4 w-4 text-blue-600" />;
        case "LOGOUT": return <LogOut className="h-4 w-4 text-gray-600" />;
        case "IMPORT": return <FileInput className="h-4 w-4 text-purple-600" />;
        case "EXPORT": return <FileOutput className="h-4 w-4 text-teal-600" />;
        default: return <Activity className="h-4 w-4 text-slate-600" />;
    }
};

const getActionBadgeVariant = (action: string) => {
    switch (action) {
        case "CREATE": return "success"; // We might need to map to shadcn variants
        case "UPDATE": return "warning";
        case "DELETE": return "destructive";
        default: return "secondary";
    }
};

const formatActionName = (action: string) => {
    const map: Record<string, string> = {
        CREATE: "Tạo mới",
        UPDATE: "Cập nhật",
        DELETE: "Xóa",
        LOGIN: "Đăng nhập",
        LOGOUT: "Đăng xuất",
        IMPORT: "Nhập Excel",
        EXPORT: "Xuất Excel"
    };
    return map[action] || action;
};

const MODULE_LABELS: Record<string, string> = {
    'ADMIN': 'Hệ thống',
    'HR': 'Nhân sự',
    'ORG': 'Tổ chức',
    'DOCUMENTS': 'Tài liệu',
    'LEAVE': 'Nghỉ phép',
    'BOOKING': 'Phòng họp',
    'CAR_BOOKING': 'Đặt xe',
    'NEWS': 'Tin tức',
    'PROJECTS': 'Dự án',
    'TASKS': 'Công việc',
    'KPI': 'KPI',
    'REQUESTS': 'Đề xuất',
};

const renderDiff = (log: AuditLog) => {
    if (log.action === 'CREATE') {
        return <span className="text-green-600">Tạo mới dữ liệu</span>;
    }
    if (log.action === 'DELETE') {
        return <span className="text-red-600">Xóa dữ liệu</span>;
    }
    if (log.action === 'LOGIN') return <span>Đăng nhập hệ thống</span>;
    if (log.action === 'LOGOUT') return <span>Đăng xuất</span>;

    if (!log.beforeJson || !log.afterJson) {
        return <span className="text-gray-400 italic">Không có dữ liệu chi tiết</span>;
    }

    const changes: React.ReactNode[] = [];
    const before = log.beforeJson;
    const after = log.afterJson;

    // Helper to translate common keys
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
        };
        return map[key] || key;
    };

    // Compare keys
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    allKeys.forEach(key => {
        // Skip system fields
        if (['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'organizerEmployeeId', 'roomId'].includes(key)) return;

        const valBefore = before[key];
        const valAfter = after[key];

        // Loosely compare (handling number/string diffs)
        if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
            // Basic formatting for display
            let displayBefore = typeof valBefore === 'object' ? '...' : String(valBefore ?? '(trống)');
            let displayAfter = typeof valAfter === 'object' ? '...' : String(valAfter ?? '(trống)');

            if (displayBefore.length > 20) displayBefore = displayBefore.substring(0, 20) + '...';
            if (displayAfter.length > 20) displayAfter = displayAfter.substring(0, 20) + '...';

            changes.push(
                <div key={key} className="flex items-center gap-1 text-[11px]">
                    <span className="font-semibold text-gray-600">{translateKey(key)}:</span>
                    <span className="text-red-500 line-through decoration-red-500/50">{displayBefore}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-green-600 font-medium">{displayAfter}</span>
                </div>
            );
        }
    });

    if (changes.length === 0) {
        return <span className="text-gray-400 italic">Không có thay đổi nào được ghi nhận</span>;
    }

    return <div className="flex flex-col gap-0.5">{changes}</div>;
};

export function AuditTable({ data, isLoading, sort, onSort }: AuditTableProps) {
    const SortIcon = ({ field }: { field: string }) => {
        if (!sort || sort.sortBy !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:bg-muted/50 rounded" />;
        return sort.order === "asc"
            ? <ChevronUp className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />
            : <ChevronDown className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />;
    };

    if (isLoading) {
        return <div className="text-center py-8 text-muted-foreground">Đang tải dữ liệu...</div>;
    }

    if (!data || data.length === 0) {
        return <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/10">Không có lịch sử hoạt động nào</div>;
    }

    return (
        <div className="rounded-md border bg-card shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => onSort?.("createdAt")}>
                            <div className="flex items-center">
                                Thời gian <SortIcon field="createdAt" />
                            </div>
                        </TableHead>
                        <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => onSort?.("actor.username")}>
                            <div className="flex items-center">
                                Người thực hiện <SortIcon field="actor.username" />
                            </div>
                        </TableHead>
                        <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => onSort?.("action")}>
                            <div className="flex items-center">
                                Hành động <SortIcon field="action" />
                            </div>
                        </TableHead>
                        <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => onSort?.("entityType")}>
                            <div className="flex items-center">
                                Module <SortIcon field="entityType" />
                            </div>
                        </TableHead>
                        <TableHead className="h-10 font-medium">Chi tiết thay đổi</TableHead>
                        <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => onSort?.("ip")}>
                            <div className="flex items-center">
                                IP <SortIcon field="ip" />
                            </div>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/5">
                            <TableCell className="font-mono text-xs text-muted-foreground">
                                {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">{log.actor?.username || "System"}</span>
                                    {log.actor?.email && <span className="text-[10px] text-muted-foreground">{log.actor.email}</span>}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {getActionIcon(log.action)}
                                    <span className="text-sm font-medium">{formatActionName(log.action)}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-[10px]">{log.entityType}</Badge>
                                    <span className="text-xs font-mono text-muted-foreground truncate max-w-[100px]" title={log.entityId}>
                                        {log.entityId.substring(0, 8)}...
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="max-w-[400px]">
                                <div className="text-xs space-y-1">
                                    {renderDiff(log)}
                                </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                                {log.computerName && log.computerName !== log.ip ? (
                                    <div className="flex flex-col">
                                        <span>{log.computerName}</span>
                                        <span className="text-[10px] text-gray-400">{log.ip}</span>
                                    </div>
                                ) : (
                                    log.ip || "-"
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
