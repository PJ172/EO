"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch } from "@/lib/api-client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/layout/page-header";
import { Loader2, ShieldCheck, Info, Save, Plus } from "lucide-react";
import { toast } from "sonner";

interface Permission {
    id: string;
    code: string;
    description: string;
    module: string;
}

interface Role {
    id: string;
    code: string;
    name: string;
    description?: string;
    permissionsCount: number;
    usersCount: number;
    permissions: Permission[];
}

const MODULE_TRANSLATIONS: Record<string, string> = {
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

const PERMISSION_TRANSLATIONS: Record<string, string> = {
    // HR
    'EMPLOYEE_READ': 'Xem nhân viên',
    'EMPLOYEE_CREATE': 'Thêm nhân viên',
    'EMPLOYEE_UPDATE': 'Sửa nhân viên',
    'EMPLOYEE_DELETE': 'Xóa nhân viên',
    'EMPLOYEE_UPLOAD_FILE': 'Tải lên hồ sơ',
    'EMPLOYEE_SENSITIVE_READ': 'Xem dữ liệu nhạy cảm (CCCD, Lương...)',
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

interface RoleFormProps {
    roleId?: string | null;
    returnUrl?: string;
}

export function RoleForm({ roleId, returnUrl = "/settings/roles" }: RoleFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

    const isEditMode = !!roleId;

    // Fetch Role if editing
    const { data: roleData, isLoading: isLoadingRole } = useQuery({
        queryKey: ["role", roleId],
        queryFn: () => apiGet<{ data: Role }>(`/roles/${roleId}`),
        enabled: !!roleId,
    });
    const editRole = roleData?.data || null;

    // Fetch permissions grouped
    const { data: permissionsGrouped = {} } = useQuery({
        queryKey: ["permissions-grouped"],
        queryFn: () => apiGet<Record<string, Permission[]>>("/roles/permissions/grouped"),
    });

    useEffect(() => {
        if (editRole) {
            setCode(editRole.code);
            setName(editRole.name);
            setDescription(editRole.description || "");
            setSelectedPerms(new Set(editRole.permissions?.map((p) => p.id) || []));
        }
    }, [editRole]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: any) => apiPost<{ data: Role }>("/roles", data),
        onSuccess: (data: { data: Role }) => {
            const newRoleId = data.data.id;
            // Also assign selected permissions when creating
            if (selectedPerms.size > 0) {
                updatePermsMutation.mutate({ id: newRoleId, permissionIds: Array.from(selectedPerms) });
            } else {
                queryClient.invalidateQueries({ queryKey: ["roles"] });
                toast.success("Tạo vai trò thành công!");
                router.push(returnUrl);
            }
        },
        onError: (error: any) => toast.error(error?.response?.data?.message || "Lỗi khi tạo vai trò"),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => apiPatch(`/roles/${id}`, data),
        onSuccess: () => { },
        onError: (error: any) => toast.error(error?.response?.data?.message || "Lỗi khi cập nhật thông tin"),
    });

    const updatePermsMutation = useMutation({
        mutationFn: ({ id, permissionIds }: { id: string; permissionIds: string[] }) =>
            apiPost(`/roles/${id}/permissions`, { permissionIds }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            toast.success(isEditMode ? "Cập nhật thành công!" : "Tạo vai trò và phân quyền thành công!");
            router.push(returnUrl);
        },
        onError: (error: any) => toast.error(error?.response?.data?.message || "Lỗi khi cập nhật quyền"),
    });

    const handleToggle = (permId: string) => {
        setSelectedPerms((prev) => {
            const next = new Set(prev);
            if (next.has(permId)) next.delete(permId);
            else next.add(permId);
            return next;
        });
    };

    const handleToggleModule = (module: string, checked: boolean) => {
        const modulePerms = permissionsGrouped[module] || [];
        setSelectedPerms((prev) => {
            const next = new Set(prev);
            if (checked) {
                modulePerms.forEach(p => next.add(p.id));
            } else {
                modulePerms.forEach(p => next.delete(p.id));
            }
            return next;
        });
    };

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Vui lòng nhập tên vai trò");
            return;
        }

        if (isEditMode && editRole) {
            updateMutation.mutate({
                id: editRole.id,
                data: { name, description }
            }, {
                onSuccess: () => {
                    updatePermsMutation.mutate({ id: editRole.id, permissionIds: Array.from(selectedPerms) });
                }
            });
        } else {
            if (!code.trim()) {
                toast.error("Vui lòng nhập mã vai trò");
                return;
            }
            createMutation.mutate({ code, name, description });
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending || updatePermsMutation.isPending;

    if (isEditMode && isLoadingRole) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto w-full pb-10">
            <PageHeader
                title={isEditMode ? (
                    <div className="flex items-center gap-2">
                        Thiết lập Vai trò: <span className="font-bold text-primary">{editRole?.name}</span>
                        <Badge variant="secondary" className="ml-2 font-mono">{editRole?.code}</Badge>
                    </div>
                ) : (
                    "Khởi tạo Vai trò mới"
                )}
                description={isEditMode ? "Cập nhật thông tin và phân quyền" : "Thêm mới vai trò vào hệ thống để phân cấp quyền"}
                backHref={returnUrl}
                icon={
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm text-white">
                        <ShieldCheck className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" onClick={() => router.push(returnUrl)} className="h-10 px-4">
                            Hủy bỏ
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSubmitting || !name.trim() || (!isEditMode && !code.trim())}
                            className="h-10 px-6 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditMode ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />)}
                            {isEditMode ? "Lưu thay đổi" : "Tạo vai trò"}
                        </Button>
                    </div>
                }
            />

            <div className="flex-1 space-y-6">
                {/* INFO PANEL */}
                <Card className="rounded-xl border shadow-sm">
                    <CardHeader className="bg-muted/10 pb-4 border-b">
                        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            <Info className="h-4 w-4" />
                            <span>Thông tin chung</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {!isEditMode && (
                                <div className="space-y-2">
                                    <Label htmlFor="code" required={true} className="font-semibold">Mã vai trò (*)</Label>
                                    <Input
                                        id="code"
                                        value={code}
                                        onChange={e => setCode(e.target.value)}
                                        placeholder="VD: MANAGER"
                                        className="uppercase font-mono bg-background focus-visible:ring-1"
                                        disabled={isEditMode}
                                    />
                                    <p className="text-[11px] text-muted-foreground">Mã viết hoa, không dấu, không khoảng trắng (vd: HR_LEADER).</p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="name" required>Tên vai trò (*)</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="bg-background focus-visible:ring-1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Mô tả chi tiết</Label>
                                <Input
                                    id="description"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="bg-background focus-visible:ring-1"
                                />
                            </div>

                            {isEditMode && editRole && (
                                <div className="md:col-span-2 flex gap-4 mt-2">
                                    <div className="flex items-center text-sm gap-2 bg-muted/30 px-3 py-2 rounded-md border border-muted">
                                        <span className="text-muted-foreground">Người dùng gán:</span>
                                        <span className="font-semibold">{editRole.usersCount} users</span>
                                    </div>
                                    <div className="flex items-center text-sm gap-2 bg-muted/30 px-3 py-2 rounded-md border border-muted">
                                        <span className="text-muted-foreground">Tổng quyền:</span>
                                        <span className="font-semibold text-primary">{selectedPerms.size} quyền</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* PERMISSIONS PANEL */}
                <Card className="rounded-xl border shadow-sm">
                    <CardHeader className="bg-muted/10 pb-4 border-b">
                        <div className="flex flex-wrap justify-between items-center gap-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                <ShieldCheck className="h-4 w-4" />
                                <span>Phân quyền chi tiết</span>
                            </div>
                            <Badge variant="outline" className="text-[13px] py-1 px-3 bg-primary/5 text-primary border-primary/20">
                                Đã chọn {selectedPerms.size} quyền
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                            {Object.entries(permissionsGrouped).map(([module, perms]) => {
                                const allSelected = perms.every((p) => selectedPerms.has(p.id));
                                const someSelected = perms.some((p) => selectedPerms.has(p.id));

                                return (
                                    <Card key={module} className="shadow-sm border border-border/60 transition-all hover:border-primary/40 hover:shadow-md">
                                        <CardHeader className="p-2.5 border-b bg-muted/20">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`module-${module}`}
                                                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                                    onCheckedChange={(checked) => handleToggleModule(module, !!checked)}
                                                    className="w-4 h-4 rounded-sm data-[state=checked]:bg-primary"
                                                />
                                                <label htmlFor={`module-${module}`} className="font-semibold cursor-pointer text-sm flex-1">
                                                    {MODULE_TRANSLATIONS[module] || module}
                                                </label>
                                                <Badge variant="secondary" className="text-xs font-medium bg-background border">
                                                    {perms.filter(p => selectedPerms.has(p.id)).length} / {perms.length}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-3 space-y-2">
                                            {perms.map((perm) => (
                                                <div key={perm.id} className="flex items-start gap-3 group">
                                                    <Checkbox
                                                        id={perm.id}
                                                        checked={selectedPerms.has(perm.id)}
                                                        onCheckedChange={() => handleToggle(perm.id)}
                                                        className="mt-0.5"
                                                    />
                                                    <label htmlFor={perm.id} className="text-[13px] cursor-pointer flex-1 leading-tight w-full hover:text-primary transition-colors">
                                                        <div className="font-medium text-foreground">{PERMISSION_TRANSLATIONS[perm.code] || perm.description}</div>
                                                        <div className="text-[11px] text-muted-foreground mt-0.5 font-mono opacity-60">{perm.code}</div>
                                                    </label>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
