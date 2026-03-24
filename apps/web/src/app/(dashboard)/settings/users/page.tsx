"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, apiPatch, apiDelete, getAccessToken } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControl } from "@/components/ui/pagination-control";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useUpdateUser } from "@/services/users.service";
import { getAvatarUrl, getAvatarColor, getInitials } from "@/lib/avatar-utils";
import { EmployeeAvatar } from "@/components/ui/employee-avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
} from "@/components/ui/sheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAvatarLightbox } from "@/components/ui/avatar-lightbox";
import { MoreHorizontal, Plus, Search, Filter, FileDown, FileUp, Info, ArrowUpDown, ChevronUp, ChevronDown, Trash2, Upload, Loader2, UserCircle, Mail, Key, Shield, ShieldCheck, CheckCircle2, XCircle, Users as UsersIcon, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { SearchBar } from "@/components/ui/search-bar";
import { format } from "date-fns";
import { UserPermissionsDialog } from "@/components/users/user-permissions-dialog";
import { PasswordConfirmDialog } from "@/components/ui/password-confirm-dialog";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";
import { useTableColumns, ColumnDef } from "@/hooks/use-table-columns";
import { Columns3 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useSortState } from "@/hooks/use-sort-state";
import { useRouter } from "next/navigation";
import { ImportUserDialog } from "@/components/users/import-user-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Default column definitions for users table
const USER_DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "avatar", label: "Avatar" },
    { key: "username", label: "Tên đăng nhập" },
    { key: "email", label: "Email" },
    { key: "employeeCode", label: "Mã nhân viên" },
    { key: "fullName", label: "Nhân viên" },
    { key: "department", label: "Phòng ban" },
    { key: "roles", label: "Vai trò" },
    { key: "status", label: "Trạng thái" },
    { key: "createdAt", label: "Người/Ngày tạo", defaultVisible: false },
    { key: "updatedAt", label: "Người/Ngày sửa", defaultVisible: false },
];

interface User {
    id: string;
    username: string;
    email: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
        avatar?: string;
        department?: {
            id: string;
            name: string;
        };
    };
    createdBy?: { username: string; email: string };
    updatedBy?: { username: string; email: string };
    roles: {
        id: string;
        code: string;
        name: string;
        permissions?: {
            permission: {
                id: string;
                code: string;
            }
        }[];
    }[];
    permissions?: { id: string; code: string; description?: string }[];
}

interface Role {
    id: string;
    code: string;
    name: string;
}

interface Permission {
    id: string;
    code: string;
    description: string;
    module?: string;
}

const MODULE_LABELS: Record<string, string> = {
    'ADMIN': 'Hệ thống',
    'SETTINGS': 'Cài đặt',
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
    // ADMIN (System)
    'USER_ROLE_MANAGE': 'Quản lý quyền',
    'AUDITLOG_VIEW': 'Xem nhật ký hệ thống',
    'SETTINGS_VIEW': 'Truy cập cài đặt',
    'SETTINGS_MANAGE': 'Quản lý cài đặt',
    'EXPORT_DATA': 'Xuất Excel',
    'IMPORT_DATA': 'Nhập Excel',
    // HR
    'EMPLOYEE_READ': 'Xem nhân viên',
    'EMPLOYEE_CREATE': 'Tạo nhân viên',
    'EMPLOYEE_UPDATE': 'Sửa nhân viên',
    'EMPLOYEE_DELETE': 'Xóa nhân viên',
    'EMPLOYEE_UPLOAD_FILE': 'Upload hồ sơ',
    'EMPLOYEE_SENSITIVE_READ': 'Xem bảo mật',
    'EMPLOYEE_ALL_VIEW': 'Xem tất cả',
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
    'DOCUMENT_UPDATE': 'Cập nhật tài liệu',
    'DOCUMENT_APPROVE': 'Phê duyệt tài liệu',
    // LEAVE
    'LEAVE_CREATE': 'Tạo đơn nghỉ phép',
    'LEAVE_VIEW': 'Xem đơn nghỉ phép',
    'LEAVE_READ': 'Xem đơn nghỉ phép',
    'LEAVE_APPROVE': 'Duyệt đơn nghỉ phép',
    'LEAVE_MANAGE': 'Quản lý nghỉ phép',
    // ROOM BOOKING
    'ROOM_READ': 'Xem phòng họp',
    'ROOM_VIEW': 'Xem phòng họp',
    'ROOM_BOOK': 'Đặt phòng họp',
    'ROOM_MANAGE': 'Quản lý phòng họp',
    'ROOM_CREATE': 'Thêm phòng họp',
    'ROOM_UPDATE': 'Sửa phòng họp',
    'ROOM_DELETE': 'Xóa phòng họp',
    // NEWS
    'NEWS_READ': 'Xem tin tức',
    'NEWS_VIEW': 'Xem tin tức',
    'NEWS_CREATE': 'Đăng tin tức',
    'NEWS_APPROVE': 'Duyệt tin tức',
    'NEWS_MANAGE': 'Quản lý tin tức',
    'NEWS_UPDATE': 'Sửa tin',
    'NEWS_DELETE': 'Xóa tin',
    'NEWS_PUBLISH': 'Xuất bản tin',
    // KPI
    'KPI_READ': 'Xem KPI',
    'KPI_VIEW': 'Xem KPI',
    'KPI_CREATE': 'Tạo KPI',
    'KPI_EVALUATE': 'Đánh giá KPI',
    'KPI_APPROVE': 'Duyệt KPI',
    'KPI_UPDATE': 'Sửa KPI',
    'KPI_MANAGE': 'Quản lý KPI',
    // PROJECT & TASKS
    'PROJECT_READ': 'Xem dự án',
    'PROJECT_VIEW': 'Xem dự án',
    'PROJECT_CREATE': 'Tạo dự án',
    'PROJECT_MANAGE': 'Quản lý dự án',
    'PROJECT_UPDATE': 'Sửa dự án',
    'PROJECT_DELETE': 'Xóa dự án',
    'TASK_READ': 'Xem công việc',
    'TASK_VIEW': 'Xem công việc',
    'TASK_CREATE': 'Giao công việc',
    'TASK_MANAGE': 'Quản lý công việc',
    'TASK_UPDATE': 'Sửa việc',
    'TASK_DELETE': 'Xóa việc',
    'TASK_ASSIGN': 'Phân công việc',
    // CAR
    'CAR_READ': 'Xem lịch xe',
    'CAR_VIEW': 'Xem lịch xe',
    'CAR_BOOK': 'Đặt xe công tác',
    'CAR_MANAGE': 'Quản lý điều xe',
    // REQUESTS
    'REQUEST_READ': 'Xem đề xuất',
    'REQUEST_VIEW': 'Xem đề xuất',
    'REQUEST_CREATE': 'Tạo đề xuất',
    'REQUEST_APPROVE': 'Duyệt đề xuất',
    // TIMEKEEPING
    'TIMEKEEPING_VIEW': 'Xem chấm công',
    'TIMEKEEPING_MANAGE': 'Quản lý chấm công',
    'TIMEKEEPING_EXPORT': 'Xuất file chấm công',
};

const PermissionSelector = ({
    selectedIds,
    onChange,
    groupedPermissions,
}: {
    selectedIds: string[],
    onChange: (ids: string[]) => void,
    groupedPermissions: Record<string, Permission[]> | undefined
}) => {
    const [permSearch, setPermSearch] = React.useState("");

    if (!groupedPermissions) return <div className="p-3 text-center text-muted-foreground text-xs">Đang tải danh sách quyền...</div>;

    // Filter permissions by search
    const searchLower = permSearch.toLowerCase().trim();
    const filteredGroups = searchLower
        ? Object.entries(groupedPermissions).reduce<Record<string, Permission[]>>((acc, [module, perms]) => {
            const moduleLabel = (MODULE_LABELS[module] || module).toLowerCase();
            const filtered = perms.filter(p => {
                const label = (PERMISSION_LABELS[p.code] || p.description || p.code).toLowerCase();
                return label.includes(searchLower) || p.code.toLowerCase().includes(searchLower) || moduleLabel.includes(searchLower);
            });
            if (filtered.length > 0) acc[module] = filtered;
            return acc;
        }, {})
        : groupedPermissions;

    return (
        <div className="border rounded-md overflow-hidden bg-background shadow-sm">
            {/* Search bar */}
            <div className="px-2 py-1.5 border-b bg-muted/30">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <input
                        type="text"
                        value={permSearch}
                        onChange={(e) => setPermSearch(e.target.value)}
                        placeholder="Tìm module hoặc quyền..."
                        className="w-full h-8 pl-7 pr-2 text-xs bg-background border border-border/60 rounded-md outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    />
                </div>
            </div>
            <div className="grid grid-cols-12 bg-muted/50 border-b text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <div className="col-span-3 px-3 py-1.5 border-r">Module</div>
                <div className="col-span-9 px-3 py-1.5 text-center">Tên quyền hạn</div>
            </div>
            <div className="max-h-[290px] overflow-y-auto divide-y">
                {Object.keys(filteredGroups).length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">Không tìm thấy quyền nào</div>
                ) : (
                    Object.entries(filteredGroups).map(([module, perms]) => (
                        <div key={module} className="grid grid-cols-12 hover:bg-muted/5 transition-colors">
                            <div className="col-span-3 px-3 py-2 border-r bg-muted/5 font-semibold text-[12px] text-foreground/80 flex items-center">
                                {MODULE_LABELS[module] || module}
                            </div>
                            <div className="col-span-9 px-2.5 py-1.5 bg-background/50">
                                <div className="grid grid-cols-3 gap-1">
                                    {perms.map((p) => (
                                        <div
                                            key={p.id}
                                            className={cn(
                                                "flex items-center gap-2 px-2 py-0.5 rounded transition-all cursor-pointer border border-transparent",
                                                selectedIds.includes(p.id)
                                                    ? "bg-primary/5 text-primary border-primary/10"
                                                    : "hover:bg-muted/30"
                                            )}
                                            onClick={() => {
                                                const newIds = selectedIds.includes(p.id)
                                                    ? selectedIds.filter(id => id !== p.id)
                                                    : [...selectedIds, p.id];
                                                onChange(newIds);
                                            }}
                                        >
                                            <Checkbox
                                                id={`perm-${p.id}`}
                                                checked={selectedIds.includes(p.id)}
                                                onCheckedChange={() => {
                                                    const newIds = selectedIds.includes(p.id)
                                                        ? selectedIds.filter(id => id !== p.id)
                                                        : [...selectedIds, p.id];
                                                    onChange(newIds);
                                                }}
                                                className="h-4 w-4 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[12px] font-medium leading-tight">
                                                    {PERMISSION_LABELS[p.code] || p.description || p.code}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-mono opacity-50 leading-tight">
                                                    {p.code}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// Extracted User Row with React.memo to prevent massive UI lag when checking "Select All"
const MemoizedUserRow = React.memo(({
    user,
    index,
    isSelected,
    visibleColumns,
    onSelectRow,
    onEditUser,
    onRowMouseDown,
    onRowMouseEnter,
    onStatusToggle,
    isUpdatingStatus,
}: {
    user: User;
    index: number;
    isSelected: boolean;
    visibleColumns: ColumnDef[];
    onSelectRow: (id: string, checked: boolean) => void;
    onEditUser: (user: User) => void;
    onRowMouseDown: (index: number, id: string, e: React.MouseEvent) => void;
    onRowMouseEnter: (id: string) => void;
    onStatusToggle: (id: string, currentStatus: string) => void;
    isUpdatingStatus: string | null;
}) => {
    return (
        <TableRow
            data-state={isSelected && "selected"}
            className="group cursor-pointer hover:bg-muted/80 hover:shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-200 border-b border-border"
            onMouseEnter={() => onRowMouseEnter(user.id)}
            onClick={(e) => {
                if (
                    (e.target as HTMLElement).closest('td:first-child') ||
                    (e.target as HTMLElement).closest('button') ||
                    (e.target as HTMLElement).closest('[role=checkbox]')
                ) return;
                onEditUser(user);
            }}
        >
            <TableCell
                className="px-4 py-3 select-none cursor-pointer"
                onMouseDown={(e) => onRowMouseDown(index, user.id, e)}
            >
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectRow(user.id, checked as boolean)}
                    className="transition-transform data-[state=checked]:scale-105 pointer-events-none"
                />
            </TableCell>
            {visibleColumns.map(col => {
                const renderers: Record<string, () => React.ReactNode> = {
                    avatar: () => <EmployeeAvatar avatar={user.employee?.avatar} fullName={user.employee?.fullName || user.username} fallbackClassName="text-xs" />,
                    username: () => (
                        <div className="flex flex-col">
                            <span className="font-medium">{user.username.split('_DELETED_')[0]}</span>
                            {user.username.includes('_DELETED_') && (
                                <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-sm w-fit mt-0.5">Đã xóa</span>
                            )}
                        </div>
                    ),
                    email: () => <span className="text-muted-foreground">{user.email ? user.email.split('_DELETED_')[0] : '—'}</span>,
                    employeeCode: () => <span className="font-medium">{user.employee?.employeeCode || '-'}</span>,
                    fullName: () => user.employee ? <span className="whitespace-nowrap">{user.employee.fullName}</span> : <span className="text-muted-foreground">-</span>,
                    department: () => user.employee?.department ? <span className="whitespace-nowrap">{user.employee.department.name}</span> : <span className="text-muted-foreground/50 italic">—</span>,
                    roles: () => <div className="flex flex-wrap gap-1 min-w-[120px]">{user.roles.map((role) => {
                        const roleColors: Record<string, string> = {
                            'ADMIN': 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
                            'Administrator': 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
                            'MANAGER': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
                            'Manager': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
                        };
                        const colorClass = roleColors[role.code] || roleColors[role.name] || 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
                        return <span key={role.id} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>{role.name}</span>;
                    })}</div>,
                    status: () => (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Switch
                                checked={user.status === 'ACTIVE'}
                                disabled={isUpdatingStatus === user.id}
                                onCheckedChange={() => onStatusToggle(user.id, user.status)}
                                className="data-[state=checked]:bg-emerald-500 scale-90"
                            />
                            <span className={`text-[11px] font-semibold uppercase tracking-wider ${user.status === 'ACTIVE' ? "text-emerald-600" : "text-slate-400"}`}>
                                {user.status === 'ACTIVE' ? "Hoạt động" : "Ngừng"}
                            </span>
                        </div>
                    ),
                    createdAt: () => <div className="flex flex-col text-xs min-w-[120px]"><span>{user.createdBy?.username || '-'}</span><span className="text-muted-foreground">{user.createdAt ? format(new Date(user.createdAt), "dd/MM/yyyy HH:mm") : '-'}</span></div>,
                    updatedAt: () => <div className="flex flex-col text-xs min-w-[120px]"><span>{user.updatedBy?.username || '-'}</span><span className="text-muted-foreground">{user.updatedAt ? format(new Date(user.updatedAt), "dd/MM/yyyy HH:mm") : '-'}</span></div>,
                };
                const render = renderers[col.key];
                return <TableCell key={col.key}>{render ? render() : '—'}</TableCell>;
            })}
            {/* Quick Actions at the end of the row */}
        </TableRow>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.user.id === nextProps.user.id &&
        prevProps.user.status === nextProps.user.status &&
        prevProps.user.updatedAt === nextProps.user.updatedAt &&
        prevProps.isUpdatingStatus === nextProps.isUpdatingStatus &&
        prevProps.visibleColumns.length === nextProps.visibleColumns.length
    );
});

export default function UsersPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const avatarLightbox = useAvatarLightbox();
    const [search, setSearch] = useState("");

    const { sortKey, sortDir, handleSort: toggleSort, resetSort } = useSortState("users", "username", "asc");
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [rolesDialogUser, setRolesDialogUser] = useState<User | null>(null);
    const updateUser = useUpdateUser();
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
    const [importOpen, setImportOpen] = useState(false);
    const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
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

    // Column configuration
    const { visibleColumns, allColumns } = useTableColumns("users", USER_DEFAULT_COLUMNS);

    // Individual permissions state
    const [permissionsUser, setPermissionsUser] = useState<User | null>(null);

    // Bulk role states
    const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
    const [bulkRoleIds, setBulkRoleIds] = useState<string[]>([]);

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Fetch users
    const { data: usersData, isLoading, refetch } = useQuery({
        queryKey: ["users", search, sortKey, sortDir, page, pageSize],
        queryFn: () => apiGet<{ data: User[]; meta: any }>(`/users?search=${search}&page=${page}&limit=${pageSize}&sortBy=${sortKey}&order=${sortDir}`),
    });

    // Drag-select state
    const isDragging = useRef(false);
    const dragStartIndex = useRef<number | null>(null);
    const lastShiftIndex = useRef<number | null>(null);

    // Drag select handlers
    const handleRowMouseDown = useCallback((index: number, id: string, e: React.MouseEvent) => {
        if (e.shiftKey && lastShiftIndex.current !== null) {
            e.preventDefault();
            const start = Math.min(lastShiftIndex.current, index);
            const end = Math.max(lastShiftIndex.current, index);
            const rangeIds = usersData?.data.slice(start, end + 1).map(u => u.id) || [];
            setSelectedRows(prev => {
                const newSet = new Set(prev);
                rangeIds.forEach(rid => newSet.add(rid));
                return Array.from(newSet);
            });
            return;
        }
        lastShiftIndex.current = index;
        isDragging.current = true;
        dragStartIndex.current = index;
        setSelectedRows(prev => {
            if (prev.includes(id)) return prev.filter(r => r !== id);
            return [...prev, id];
        });
    }, [usersData?.data]);

    const handleRowMouseEnter = useCallback((id: string) => {
        if (!isDragging.current) return;
        setSelectedRows(prev => {
            if (prev.includes(id)) return prev;
            return [...prev, id];
        });
    }, []);

    useEffect(() => {
        const handleMouseUp = () => { isDragging.current = false; };
        window.addEventListener("mouseup", handleMouseUp);
        return () => window.removeEventListener("mouseup", handleMouseUp);
    }, []);

    // Fetch all roles for assignment
    const { data: roles } = useQuery({
        queryKey: ["roles"],
        queryFn: () => apiGet<Role[]>("/roles"),
    });

    const roleOptions = React.useMemo(() => (roles || []).map(r => ({
        label: `${r.name} (${r.code})`,
        value: r.id
    })), [roles]);

    // Fetch all permissions for assignment
    const { data: permissionsData } = useQuery({
        queryKey: ["permissions-list"],
        queryFn: () => apiGet<Permission[]>("/roles/permissions"),
    });

    const permissionOptions = React.useMemo(() => (permissionsData || []).map(p => ({
        label: p.description ? `${p.description} (${p.code})` : p.code,
        value: p.id
    })), [permissionsData]);

    // Fetch grouped permissions
    const { data: groupedPermissions } = useQuery({
        queryKey: ["permissions-grouped"],
        queryFn: () => apiGet<Record<string, Permission[]>>("/roles/permissions/grouped"),
    });

    // Fetch all employees for Combobox
    const { data: employeesData } = useQuery({
        queryKey: ["employees-all"],
        queryFn: () => apiGet<{ data: any[] }>("/employees?limit=1000"),
    });

    const employees = employeesData?.data || [];
    const employeeOptions = React.useMemo(() => [
        { value: "", label: "-- Chọn --" },
        ...(employeesData?.data || []).map((emp) => ({
            value: emp.id,
            label: `${emp.employeeCode} - ${emp.fullName}`,
        }))
    ], [employeesData]);

    const users = usersData?.data || [];
    const meta = usersData?.meta;
    const totalPages = meta?.totalPages || 0;



    const handleSelectAll = (checked: boolean) => {
        if (checked && users.length > 0) {
            setSelectedRows(users.map(u => u.id));
        } else {
            setSelectedRows([]);
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedRows(prev => [...prev, id]);
        } else {
            setSelectedRows(prev => prev.filter(rowId => rowId !== id));
        }
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiDelete(`/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        }
    });

    const handleBulkDelete = async () => {
        if (!confirm(`Bạn có chắc muốn xóa ${selectedRows.length} users đã chọn?`)) return;

        try {
            await apiPost("/users/bulk-delete", { ids: selectedRows });
            toast.success(`Đã xóa ${selectedRows.length} người dùng`);
            setSelectedRows([]);
            refetch();
        } catch (e: any) {
            const msg = e?.response?.data?.message || "Lỗi hệ thống khi xóa";
            toast.error(`Lỗi: ${msg}`);
        }
    };

    const handleDeleteUser = (user: User) => {
        if (confirm(`Bạn có chắc muốn xóa user "${user.username}"?`)) {
            deleteMutation.mutate(user.id);
        }
    };

    const restoreMutation = useMutation({
        mutationFn: (id: string) => apiPost(`/users/${id}/restore`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("Khôi phục tài khoản thành công");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Lỗi khi khôi phục tài khoản");
        }
    });

    const hardDeleteMutation = useMutation({
        mutationFn: (id: string) => apiDelete(`/users/${id}/force`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("Xóa vĩnh viễn tài khoản thành công");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Lỗi khi xóa tài khoản");
        }
    });

    const handleRestoreUser = (user: User) => {
        if (confirm(`Bạn có chắc muốn khôi phục tài khoản "${user.username.replace(/_DELETED_\d+/, "")}"?`)) {
            restoreMutation.mutate(user.id);
        }
    }

    const handleHardDeleteUser = (user: User) => {
        setConfirmDialog({
            open: true,
            title: "Xóa vĩnh viễn",
            description: `CẢNH BÁO: Hành động này không thể hoàn tác.\nBạn có chắc muốn XÓA VĨNH VIỄN tài khoản "${user.username.replace(/_DELETED_\d+/, "")}"?\nNhập mật khẩu quản trị để xác nhận.`,
            onConfirm: () => hardDeleteMutation.mutate(user.id)
        });
    }



    // Assign roles mutation
    const assignRolesMutation = useMutation({
        mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
            apiPost(`/users/${id}/roles`, { roleIds }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setRolesDialogUser(null);
            toast.success("Cập nhật quyền thành công!");
        },
        onError: () => toast.error("Lỗi khi cập nhật quyền"),
    });

    const bulkAssignRolesMutation = useMutation({
        mutationFn: (data: { userIds: string[]; roleIds: string[] }) =>
            apiPost(`/users/bulk-roles`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setBulkAssignOpen(false);
            setBulkRoleIds([]);
            setSelectedRows([]);
            toast.success("Gán quyền hàng loạt thành công!");
        },
        onError: () => toast.error("Lỗi khi gán quyền hàng loạt"),
    });

    // Update user permissions mutation
    const updateUserPermissionsMutation = useMutation({
        mutationFn: ({ userId, permissionIds }: { userId: string; permissionIds: string[] }) =>
            apiPost(`/users/${userId}/permissions`, { permissionIds }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("Cập nhật quyền hạn thành công!");
        },
        onError: () => toast.error("Lỗi khi cập nhật quyền hạn"),
    });


    const handleExport = async () => {
        try {
            const token = getAccessToken();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/export/excel`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Export_Taikhoan.xlsx";
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Xuất file Excel thành công!");
        } catch {
            toast.error("Lỗi khi xuất file");
        }
    };



    const SortIcon = ({ field }: { field: string }) => {
        if (sortKey !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:bg-muted/50 rounded" />;
        return sortDir === "asc"
            ? <ChevronUp className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />
            : <ChevronDown className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />;
    };

    const handleRefresh = () => {
        resetSort();
        refetch();
    };

    // Stats
    const activeCount = users.filter(u => u.status === 'ACTIVE').length;
    const inactiveCount = users.filter(u => u.status !== 'ACTIVE').length;

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            {/* ─── Stats Cards ─── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-card text-card-foreground rounded-xl border-y border-r border-l-4 border-l-blue-500 p-2.5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Tổng người dùng</p>
                        <h3 className="text-lg font-bold mt-0.5">{meta?.total || users.length}</h3>
                    </div>
                    <div className="h-7 w-7 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <UsersIcon className="h-3.5 w-3.5" />
                    </div>
                </div>
                <div className="bg-card text-card-foreground rounded-xl border-y border-r border-l-4 border-l-emerald-500 p-2.5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Đang hoạt động</p>
                        <h3 className="text-lg font-bold mt-0.5">{activeCount}</h3>
                    </div>
                    <div className="h-7 w-7 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                </div>
                <div className="bg-card text-card-foreground rounded-xl border-y border-r border-l-4 border-l-rose-500 p-2.5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Vô hiệu hóa</p>
                        <h3 className="text-lg font-bold mt-0.5">{inactiveCount}</h3>
                    </div>
                    <div className="h-7 w-7 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
                        <XCircle className="h-3.5 w-3.5" />
                    </div>
                </div>
            </div>

            {/* ─── Header ─── */}
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <PageHeader
                    title="Quản lý Người dùng"
                    icon={
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-blue-500 to-blue-700">
                            <UsersIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                        </div>
                    }
                    className="mb-0 border-none bg-transparent p-0 shadow-none"
                    backHref="/settings"
                    onRefresh={handleRefresh}
                    isRefreshing={isLoading}
                    search={
                        <div className="relative group">
                            <SearchBar
                                placeholder="Tìm kiếm người dùng..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    }
                >
                    <div className="flex items-center gap-2">
                        {selectedRows.length > 0 ? (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Badge variant="secondary" className="h-9 px-4 rounded-xl bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">
                                    Đã chọn {selectedRows.length}
                                </Badge>
                                <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-9 rounded-xl shadow-lg shadow-destructive/20 transition-all hover:-translate-y-0.5 font-semibold">
                                    <Trash2 className="mr-2 h-4 w-4" /> Xóa hàng loạt
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Button onClick={() => router.push('/settings/users/new')} className="h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 px-5 rounded-xl font-semibold">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Thêm mới
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="h-9 bg-white/80 backdrop-blur-sm border-border/50 hover:bg-slate-100 transition-all rounded-xl shadow-sm gap-2">
                                            <Settings2 className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-semibold text-sm">Tùy chọn</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[200px] border-border shadow-lg">
                                        <PermissionGate permission="EXPORT_DATA">
                                            <DropdownMenuItem onClick={handleExport} className="py-2.5 cursor-pointer">
                                                <FileDown className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                <span>Xuất dữ liệu Excel</span>
                                            </DropdownMenuItem>
                                        </PermissionGate>
                                        <PermissionGate permission="IMPORT_DATA">
                                            <DropdownMenuItem onClick={() => setImportOpen(true)} className="py-2.5 cursor-pointer">
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
                            </>
                        )}
                    </div>
                </PageHeader>
            </div>

            {/* ─── Table ─── */}
            <div className="rounded-xl border border-border bg-card shadow-sm flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                <Table className="relative w-full">
                    <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-[40px] h-12 px-4">
                                <Checkbox
                                    checked={users.length > 0 && selectedRows.length === users.length}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                />
                            </TableHead>
                            {visibleColumns.map(col => {
                                const sortMap: Record<string, string> = { username: "username", email: "email", employeeCode: "employee.employeeCode", fullName: "employee.fullName", roles: "roles", status: "status", createdAt: "createdAt", updatedAt: "updatedAt" };
                                const sortField = sortMap[col.key];
                                return (
                                    <TableHead key={col.key}
                                        className={`h-10 font-medium whitespace-nowrap ${sortField ? "cursor-pointer hover:bg-muted/80 transition-colors group" : ""}`}
                                        onClick={sortField ? () => toggleSort(sortField) : undefined}>
                                        <div className="flex items-center">
                                            {col.label}
                                            {sortField && <SortIcon field={sortField} />}
                                        </div>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={visibleColumns.length + 1} className="text-center py-10 text-muted-foreground">
                                    Đang tải dữ liệu...
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={visibleColumns.length + 1} className="text-center py-16">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground/60">
                                        <UsersIcon className="h-12 w-12 mb-3 text-muted-foreground/40" />
                                        <p className="text-base font-medium text-muted-foreground">Chưa có người dùng nào</p>
                                        <p className="text-sm mt-1">Bấm &quot;Thêm mới&quot; hoặc &quot;Nhập Excel&quot; để bắt đầu.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user, index) => (
                                <MemoizedUserRow
                                    key={user.id}
                                    user={user}
                                    index={index}
                                    isSelected={selectedRows.includes(user.id)}
                                    visibleColumns={visibleColumns}
                                    onSelectRow={(id, checked) => {
                                        lastShiftIndex.current = index;
                                        handleSelectRow(id, checked);
                                    }}
                                    onRowMouseDown={handleRowMouseDown}
                                    onRowMouseEnter={handleRowMouseEnter}
                                    onEditUser={(u) => router.push(`/settings/users/${u.id}/edit`)}
                                    isUpdatingStatus={updatingStatusId}
                                    onStatusToggle={async (id, currentStatus) => {
                                        try {
                                            setUpdatingStatusId(id);
                                            const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                                            await updateUser.mutateAsync({ id, status: newStatus });
                                            toast.success(`Đã ${newStatus === 'ACTIVE' ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản`);
                                            refetch();
                                        } catch (error: any) {
                                            toast.error(error?.response?.data?.message || "Lỗi khi cập nhật trạng thái");
                                        } finally {
                                            setUpdatingStatusId(null);
                                        }
                                    }}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ─── Footer ─── */}
            <div className="flex items-center justify-between mt-auto bg-card p-2 rounded-xl border border-border shadow-sm">
                {selectedRows.length > 0 && (
                    <div className="flex items-center gap-3 bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20 animate-in fade-in slide-in-from-bottom-2">
                        <span className="text-sm text-indigo-700 dark:text-indigo-400 font-semibold shadow-sm">Đã chọn ({selectedRows.length})</span>
                        <Button size="sm" variant="outline" onClick={() => setBulkAssignOpen(true)} className="h-8 rounded-md border-primary/20 hover:bg-primary/5 text-primary">
                            <Shield className="mr-2 h-3.5 w-3.5" /> Gán vai trò
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="shadow-sm hover:shadow h-8 rounded-md bg-rose-500 hover:bg-rose-600">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Xóa hàng loạt
                        </Button>
                    </div>
                )}
                <div className={selectedRows.length > 0 ? "" : "ml-auto"}>
                    <PaginationControl
                        currentPage={page}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        totalCount={meta?.total || 0}
                        filteredCount={search ? (meta?.total ?? users.length) : undefined}
                        onPageChange={setPage}
                        onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            setPage(1);
                        }}
                    />
                </div>
            </div>



            {/* Bulk Assign Roles Dialog */}
            <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gán vai trò hàng loạt</DialogTitle>
                        <DialogDescription>
                            Chọn vai trò để gán cho {selectedRows.length} người dùng đã chọn. Lưu ý: Thao tác này sẽ thay thế các vai trò hiện tại của họ.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Vai trò</Label>
                            <MultiSelect
                                options={roleOptions}
                                selected={bulkRoleIds}
                                onChange={setBulkRoleIds}
                                placeholder="Chọn vai trò..."
                                className="w-full bg-background border-input shadow-sm h-10"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setBulkAssignOpen(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={() => bulkAssignRolesMutation.mutate({ userIds: selectedRows, roleIds: bulkRoleIds })}
                            disabled={bulkAssignRolesMutation.isPending || bulkRoleIds.length === 0}
                        >
                            {bulkAssignRolesMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Xác nhận gán
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Individual Permissions Dialog */}
            <UserPermissionsDialog
                open={!!permissionsUser}
                onOpenChange={(open) => !open && setPermissionsUser(null)}
                user={permissionsUser}
                permissionsGrouped={groupedPermissions}
                onUpdate={async (userId, permissionIds) => {
                    await updateUserPermissionsMutation.mutateAsync({ userId, permissionIds });
                }}
            />

            <ColumnConfigDialog
                open={isColumnConfigOpen}
                onOpenChange={setIsColumnConfigOpen}
                moduleKey="users"
                allColumns={allColumns}
                defaultColumns={USER_DEFAULT_COLUMNS}
            />

            <ImportUserDialog
                open={importOpen}
                onOpenChange={setImportOpen}
                onSuccess={() => {
                    setImportOpen(false);
                    refetch();
                }}
            />

            <PasswordConfirmDialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog(p => ({ ...p, open }))}
                title={confirmDialog.title}
                description={confirmDialog.description}
                onConfirm={confirmDialog.onConfirm}
                isLoading={hardDeleteMutation.isPending}
            />
        </div>
    );
}
