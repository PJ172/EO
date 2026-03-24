"use client";

import { useState, useMemo, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Search, Check, X, Minus, Filter, ChevronDown, ChevronRight, Save, Loader2 } from "lucide-react";

import { type Role, type Permission } from "@/services/roles.service";

interface PermissionMatrixProps {
    roles: Role[];
    permissionsGrouped: Record<string, Permission[]>;
    onUpdate?: (roleId: string, permissionIds: string[]) => Promise<void>;
}

const MODULE_LABELS: Record<string, string> = {
    'ADMIN': 'Hệ thống',
    'HR': 'Nhân sự',
    'ORG': 'Khối/Phòng/Ban',
    'DOCUMENTS': 'Tài liệu',
    'LEAVE': 'Nghỉ phép',
    'BOOKING': 'Phòng họp',
    'CAR_BOOKING': 'Đặt xe',
    'CAR': 'Xe công tác',
    'NEWS': 'Tin tức',
    'PROJECTS': 'Dự án',
    'PROJECT': 'Dự án',
    'TASKS': 'Công việc',
    'KPI': 'KPI',
    'REQUESTS': 'Đề xuất',
    'REQUEST': 'Đề xuất',
    'TIMEKEEPING': 'Chấm công',
};

const PERMISSION_LABELS: Record<string, string> = {
    // HR
    'EMPLOYEE_READ': 'Xem nhân viên',
    'EMPLOYEE_CREATE': 'Thêm nhân viên',
    'EMPLOYEE_UPDATE': 'Sửa nhân viên',
    'EMPLOYEE_DELETE': 'Xóa nhân viên',
    'EMPLOYEE_UPLOAD_FILE': 'Tải lên hồ sơ',
    'EMPLOYEE_SENSITIVE_READ': 'Đọc dữ liệu nhạy cảm (CCCD, ...)',
    'EMPLOYEE_ALL_VIEW': 'Xem toàn bộ nhân sự (Bỏ qua RLS)',
    // ORG
    'DEPARTMENT_READ': 'Xem phòng ban',
    'DEPARTMENT_MANAGE': 'Quản lý phòng ban',
    'ORGCHART_VIEW': 'Xem sơ đồ tổ chức',
    'FACTORY_READ': 'Xem nhà máy',
    'FACTORY_MANAGE': 'Quản lý nhà máy',
    'COMPANY_READ': 'Xem công ty',
    'COMPANY_MANAGE': 'Quản lý công ty',
    'DIVISION_READ': 'Xem khối',
    'DIVISION_MANAGE': 'Quản lý khối',
    'SECTION_READ': 'Xem tổ',
    'SECTION_MANAGE': 'Quản lý tổ',
    'JOBTITLE_READ': 'Xem chức danh',
    'JOBTITLE_MANAGE': 'Quản lý chức danh',
    // DOCUMENTS
    'DOCUMENT_READ': 'Xem tài liệu',
    'DOCUMENT_CREATE': 'Tạo tài liệu',
    'DOCUMENT_UPDATE': 'Sửa tài liệu',
    'DOCUMENT_APPROVE': 'Phê duyệt tài liệu',
    // LEAVE
    'LEAVE_CREATE': 'Tạo đơn nghỉ',
    'LEAVE_VIEW': 'Xem đơn nghỉ',
    'LEAVE_READ': 'Xem đơn nghỉ',
    'LEAVE_APPROVE': 'Duyệt đơn nghỉ',
    'LEAVE_MANAGE': 'Quản lý nghỉ phép',
    // ROOM BOOKING
    'ROOM_READ': 'Xem phòng',
    'ROOM_VIEW': 'Xem phòng',
    'ROOM_BOOK': 'Đặt phòng',
    'ROOM_MANAGE': 'Quản lý chung',
    'ROOM_CREATE': 'Thêm phòng',
    'ROOM_UPDATE': 'Sửa phòng',
    'ROOM_DELETE': 'Xóa phòng',
    // ADMIN (System)
    'USER_ROLE_MANAGE': 'Quản lý quyền',
    'AUDITLOG_VIEW': 'Xem logs hệ thống',
    'SETTINGS_VIEW': 'Xem cài đặt',
    'SETTINGS_MANAGE': 'Cấu hình hệ thống',
    'EXPORT_DATA': 'Xuất Excel',
    'IMPORT_DATA': 'Nhập Excel',
    // NEWS
    'NEWS_READ': 'Xem tin tức',
    'NEWS_VIEW': 'Xem tin tức',
    'NEWS_CREATE': 'Tạo tin',
    'NEWS_UPDATE': 'Sửa tin',
    'NEWS_DELETE': 'Xóa tin',
    'NEWS_PUBLISH': 'Xuất bản tin',
    'NEWS_APPROVE': 'Duyệt tin',
    'NEWS_MANAGE': 'Quản lý danh mục tin',
    // KPI
    'KPI_READ': 'Xem KPI',
    'KPI_VIEW': 'Xem KPI',
    'KPI_CREATE': 'Tạo KPI',
    'KPI_UPDATE': 'Sửa KPI',
    'KPI_EVALUATE': 'Đánh giá KPI',
    'KPI_APPROVE': 'Duyệt KPI',
    'KPI_MANAGE': 'Quản lý vòng lặp KPI',
    // PROJECT & TASK
    'PROJECT_READ': 'Xem dự án',
    'PROJECT_VIEW': 'Xem dự án',
    'PROJECT_CREATE': 'Tạo dự án',
    'PROJECT_UPDATE': 'Sửa dự án',
    'PROJECT_DELETE': 'Xóa dự án',
    'PROJECT_MANAGE': 'Quản lý dự án',
    'TASK_READ': 'Xem công việc',
    'TASK_VIEW': 'Xem công việc',
    'TASK_CREATE': 'Giao/Tạo việc',
    'TASK_UPDATE': 'Sửa việc',
    'TASK_DELETE': 'Xóa việc',
    'TASK_ASSIGN': 'Phân công việc',
    'TASK_MANAGE': 'Quản lý công việc',
    // CAR
    'CAR_READ': 'Xem lịch xe',
    'CAR_VIEW': 'Xem lịch xe',
    'CAR_MANAGE': 'Quản lý xe',
    'CAR_BOOK': 'Đặt xe',
    // REQUESTS
    'REQUEST_READ': 'Xem tờ trình',
    'REQUEST_VIEW': 'Xem tờ trình',
    'REQUEST_CREATE': 'Tạo tờ trình',
    'REQUEST_APPROVE': 'Duyệt tờ trình',
    // TIMEKEEPING
    'TIMEKEEPING_VIEW': 'Xem chấm công',
    'TIMEKEEPING_MANAGE': 'Quản lý chấm công',
    'TIMEKEEPING_EXPORT': 'Xuất file chấm công',
};

export function AdvancedPermissionMatrix({
    roles,
    permissionsGrouped,
    onUpdate,
}: PermissionMatrixProps) {
    const [searchRole, setSearchRole] = useState("");
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(Object.keys(permissionsGrouped)));
    const [localPermissions, setLocalPermissions] = useState<Record<string, Set<string>>>({});
    const [isSaving, setIsSaving] = useState<string | null>(null);

    // Initialize local permissions from roles
    useMemo(() => {
        const initialMap: Record<string, Set<string>> = {};
        roles.forEach(role => {
            initialMap[role.id] = new Set(role.permissions.map(p => p.id));
        });
        setLocalPermissions(initialMap);
    }, [roles]);

    // Filter roles by search
    const filteredRoles = useMemo(() => {
        if (!searchRole) return roles;
        const q = searchRole.toLowerCase();
        return roles.filter(r =>
            r.name.toLowerCase().includes(q) ||
            r.code.toLowerCase().includes(q)
        );
    }, [roles, searchRole]);

    // Get current permissions for a role
    const getRolePermissions = (roleId: string): Set<string> => {
        return localPermissions[roleId] || new Set();
    };

    // Check if a role has a specific permission
    const hasPermission = (roleId: string, permId: string): boolean => {
        return getRolePermissions(roleId).has(permId);
    };

    // Check module status for a role
    const getModuleStatus = (roleId: string, module: string): 'all' | 'some' | 'none' => {
        const modulePerms = permissionsGrouped[module] || [];
        const rolePerms = getRolePermissions(roleId);
        const count = modulePerms.filter(p => rolePerms.has(p.id)).length;
        if (count === modulePerms.length) return 'all';
        if (count > 0) return 'some';
        return 'none';
    };

    // Toggle individual permission
    const handleTogglePermission = (roleId: string, permId: string) => {
        setLocalPermissions(prev => {
            const next = { ...prev };
            const rolePerms = new Set(next[roleId] || []);
            if (rolePerms.has(permId)) {
                rolePerms.delete(permId);
            } else {
                rolePerms.add(permId);
            }
            next[roleId] = rolePerms;
            return next;
        });
    };

    // Toggle all permissions in a module for a role
    const handleToggleModule = (roleId: string, module: string) => {
        const status = getModuleStatus(roleId, module);
        const modulePerms = permissionsGrouped[module] || [];

        setLocalPermissions(prev => {
            const next = { ...prev };
            const rolePerms = new Set(next[roleId] || []);

            if (status === 'all') {
                // Clear all
                modulePerms.forEach(p => rolePerms.delete(p.id));
            } else {
                // Select all
                modulePerms.forEach(p => rolePerms.add(p.id));
            }

            next[roleId] = rolePerms;
            return next;
        });
    };

    // Save changes for a role
    const handleSave = async (roleId: string) => {
        if (!onUpdate) return;
        setIsSaving(roleId);
        try {
            const perms = Array.from(localPermissions[roleId] || []);
            await onUpdate(roleId, perms);
        } finally {
            setIsSaving(null);
        }
    };

    // Reset changes for a role
    const handleReset = (role: Role) => {
        setLocalPermissions(prev => ({
            ...prev,
            [role.id]: new Set(role.permissions.map(p => p.id))
        }));
    };

    // Check if a role has unsaved changes
    const hasChanges = (role: Role) => {
        const current = Array.from(localPermissions[role.id] || []).sort();
        const original = role.permissions.map(p => p.id).sort();
        return JSON.stringify(current) !== JSON.stringify(original);
    };

    // Toggle module expansion
    const toggleModuleExpansion = (module: string) => {
        setExpandedModules(prev => {
            const next = new Set(prev);
            if (next.has(module)) {
                next.delete(module);
            } else {
                next.add(module);
            }
            return next;
        });
    };

    if (!roles.length || !Object.keys(permissionsGrouped).length) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                    Không có dữ liệu vai trò hoặc quyền
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Ma trận phân quyền</CardTitle>
                        <CardDescription>Bảng phân quyền tổng thể. Bạn có thể chỉnh sửa trực tiếp trên bảng và nhấn lưu.</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs">
                            <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500 flex items-center justify-center">
                                    <Check className="h-2.5 w-2.5 text-green-600" />
                                </div>
                                <span>Tất cả</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-auto px-1.5 h-4 rounded bg-orange-500/20 border border-orange-500 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-orange-600">x/y</span>
                                </div>
                                <span>Một phần</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300" />
                                <span>Không có</span>
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm vai trò..."
                                value={searchRole}
                                onChange={(e) => setSearchRole(e.target.value)}
                                className="pl-8 w-[180px] h-9"
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-auto max-h-[70vh] border-b relative">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-30 bg-background shadow-sm">
                            <tr className="bg-muted/50">
                                <th className="sticky left-0 top-0 z-40 bg-muted/50 p-2 py-2 text-left font-semibold border-b border-r min-w-[200px]">
                                    Module / Quyền
                                </th>
                                {filteredRoles.map(role => (
                                    <th key={role.id} className="sticky top-0 z-30 bg-muted/50 p-2 text-center border-b border-r min-w-[140px]">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="font-semibold text-sm">{role.name}</span>
                                            <Badge variant="outline" className="text-[10px]">{role.code}</Badge>
                                            <div className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[11px] font-medium mt-0.5 mb-1">
                                                Tổng: {getRolePermissions(role.id).size} quyền
                                            </div>
                                            {hasChanges(role) && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleReset(role)}
                                                        disabled={isSaving === role.id}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="h-7 px-2 text-[10px]"
                                                        onClick={() => handleSave(role.id)}
                                                        disabled={isSaving === role.id}
                                                    >
                                                        {isSaving === role.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                                                        Lưu
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(permissionsGrouped).map(([module, perms]) => {
                                const isExpanded = expandedModules.has(module);
                                return (
                                    <Fragment key={module}>
                                        {/* Module Row */}
                                        <tr className="bg-muted/30 hover:bg-muted/50 transition-colors">
                                            <td
                                                className="sticky left-0 z-20 bg-muted/30 p-2 py-1.5 border-b border-r cursor-pointer"
                                                onClick={() => toggleModuleExpansion(module)}
                                            >
                                                <div className="flex items-center gap-2 font-medium">
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                    <span>{MODULE_LABELS[module] || module}</span>
                                                    <Badge variant="secondary" className="text-[10px]">{perms.length}</Badge>
                                                </div>
                                            </td>
                                            {filteredRoles.map(role => {
                                                const status = getModuleStatus(role.id, module);
                                                return (
                                                    <td
                                                        key={`${module}-${role.id}`}
                                                        className="p-1 text-center border-b border-r"
                                                        onClick={() => handleToggleModule(role.id, module)}
                                                    >
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className={cn(
                                                                        "min-w-8 h-8 px-1 rounded-md mx-auto flex items-center justify-center transition-all",
                                                                        status === 'all' && "bg-green-500/20 border-2 border-green-500",
                                                                        status === 'some' && "bg-orange-500/20 border-2 border-orange-500",
                                                                        status === 'none' && "bg-gray-100 border border-gray-300"
                                                                    )}>
                                                                        {status === 'all' && <Check className="h-4 w-4 text-green-600 font-bold" />}
                                                                        {status === 'some' && <span className="text-[11px] font-bold text-orange-600 tracking-tighter">{perms.filter(p => hasPermission(role.id, p.id)).length}/{perms.length}</span>}
                                                                        {status === 'none' && <Minus className="h-3 w-3 text-muted-foreground/30" />}
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>
                                                                        {status === 'all' && 'Có tất cả quyền. Click để xóa tất cả.'}
                                                                        {status === 'some' && `Có ${perms.filter(p => hasPermission(role.id, p.id)).length}/${perms.length} quyền. Click để chọn tất cả.`}
                                                                        {status === 'none' && 'Không có quyền nào. Click để chọn tất cả.'}
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </td>
                                                );
                                            })}
                                        </tr>

                                        {/* Permission Rows (if expanded) */}
                                        {isExpanded && perms.map(perm => (
                                            <tr key={perm.id} className="hover:bg-muted/10 transition-colors">
                                                <td className="sticky left-0 z-20 bg-background p-2 py-1.5 pl-8 border-b border-r group">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[13px]">{PERMISSION_LABELS[perm.code] || perm.code}</span>
                                                                    <Badge variant="outline" className="text-[9px] font-mono opacity-60 group-hover:opacity-100">{perm.code}</Badge>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="font-medium">{perm.code}</p>
                                                                <p className="text-xs">{perm.description}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </td>
                                                {filteredRoles.map(role => {
                                                    const hasPerm = hasPermission(role.id, perm.id);
                                                    return (
                                                        <td
                                                            key={`${perm.id}-${role.id}`}
                                                            className="p-1 text-center border-b border-r cursor-pointer hover:bg-muted/30"
                                                            onClick={() => handleTogglePermission(role.id, perm.id)}
                                                        >
                                                            <div className="flex items-center justify-center w-full h-full">
                                                                <Checkbox
                                                                    checked={hasPerm}
                                                                    onCheckedChange={() => handleTogglePermission(role.id, perm.id)}
                                                                    className="h-4 w-4"
                                                                />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

// Loading skeleton
export function PermissionMatrixSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72 mt-1" />
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-8 w-[200px]" />
                            <div className="flex gap-4">
                                {[1, 2, 3, 4].map(j => (
                                    <Skeleton key={j} className="h-8 w-20" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
