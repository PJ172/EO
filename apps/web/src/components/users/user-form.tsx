'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '@/lib/api-client';
import {
    UserCircle, Shield, Users, ChevronRight, ChevronLeft,
    Eye, EyeOff, Check, Loader2, CheckCircle2, XCircle,
    ShieldCheck, Link2, Search, KeyRound, Copy, RefreshCw, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAvatarLightbox } from '@/components/ui/avatar-lightbox';
import { getAvatarUrl } from '@/lib/avatar-utils';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface Role { id: string; code: string; name: string; }
export interface Permission { id: string; code: string; description: string; module?: string; }
export interface User {
    id: string; username: string; email: string; status: string;
    employee?: {
        id: string; fullName: string; employeeCode: string; avatar?: string;
        department?: { id: string; name: string; };
    };
    roles: Role[];
    permissions?: Permission[];
}

// ─────────────────────────────────────────────
// Label maps
// ─────────────────────────────────────────────
const MODULE_LABELS: Record<string, string> = {
    ADMIN: 'Hệ thống', SETTINGS: 'Cài đặt', HR: 'Nhân sự', ORG: 'Khối/Phòng/Ban',
    DOCUMENTS: 'Tài liệu', LEAVE: 'Nghỉ phép', BOOKING: 'Phòng họp',
    CAR_BOOKING: 'Đặt xe', CAR: 'Xe công tác', NEWS: 'Tin tức',
    PROJECTS: 'Dự án', PROJECT: 'Dự án', TASKS: 'Công việc',
    KPI: 'KPI', REQUESTS: 'Đề xuất', REQUEST: 'Đề xuất', TIMEKEEPING: 'Chấm công',
};

const PERMISSION_LABELS: Record<string, string> = {
    AUDITLOG_VIEW: 'Xem nhật ký', USER_ROLE_MANAGE: 'Quản lý quyền',
    SETTINGS_VIEW: 'Xem cài đặt', SETTINGS_MANAGE: 'Quản lý cài đặt',
    EXPORT_DATA: 'Xuất Excel', IMPORT_DATA: 'Nhập Excel',
    EMPLOYEE_READ: 'Xem NV', EMPLOYEE_CREATE: 'Tạo NV', EMPLOYEE_UPDATE: 'Sửa NV',
    EMPLOYEE_DELETE: 'Xóa NV', EMPLOYEE_UPLOAD_FILE: 'Upload hồ sơ',
    EMPLOYEE_SENSITIVE_READ: 'Xem bảo mật', EMPLOYEE_ALL_VIEW: 'Xem toàn bộ',
    DEPARTMENT_READ: 'Xem PB', DEPARTMENT_MANAGE: 'Quản lý PB',
    ORGCHART_VIEW: 'Sơ đồ tổ chức',
    FACTORY_READ: 'Xem NM', FACTORY_MANAGE: 'Quản lý NM',
    COMPANY_READ: 'Xem CT', COMPANY_MANAGE: 'Quản lý CT',
    DIVISION_READ: 'Xem khối', DIVISION_MANAGE: 'Quản lý khối',
    SECTION_READ: 'Xem tổ', SECTION_MANAGE: 'Quản lý tổ',
    JOBTITLE_READ: 'Xem chức danh', JOBTITLE_MANAGE: 'Quản lý chức danh',
    DOCUMENT_READ: 'Xem', DOCUMENT_CREATE: 'Tạo', DOCUMENT_UPDATE: 'Sửa', DOCUMENT_APPROVE: 'Duyệt',
    LEAVE_CREATE: 'Tạo đơn', LEAVE_VIEW: 'Xem đơn', LEAVE_READ: 'Xem đơn',
    LEAVE_APPROVE: 'Duyệt đơn', LEAVE_MANAGE: 'Quản lý',
    ROOM_READ: 'Xem PH', ROOM_VIEW: 'Xem PH', ROOM_BOOK: 'Đặt phòng',
    ROOM_MANAGE: 'Quản lý PH', ROOM_CREATE: 'Thêm PH', ROOM_UPDATE: 'Sửa PH', ROOM_DELETE: 'Xóa PH',
    NEWS_READ: 'Xem', NEWS_VIEW: 'Xem', NEWS_CREATE: 'Đăng tin',
    NEWS_APPROVE: 'Duyệt', NEWS_MANAGE: 'Quản lý', NEWS_UPDATE: 'Sửa', NEWS_DELETE: 'Xóa', NEWS_PUBLISH: 'Xuất bản',
    KPI_READ: 'Xem', KPI_VIEW: 'Xem', KPI_CREATE: 'Tạo', KPI_EVALUATE: 'Đánh giá',
    KPI_APPROVE: 'Duyệt', KPI_UPDATE: 'Sửa', KPI_MANAGE: 'Quản lý',
    PROJECT_READ: 'Xem', PROJECT_VIEW: 'Xem', PROJECT_CREATE: 'Tạo',
    PROJECT_MANAGE: 'Quản lý', PROJECT_UPDATE: 'Sửa', PROJECT_DELETE: 'Xóa',
    TASK_READ: 'Xem', TASK_VIEW: 'Xem', TASK_CREATE: 'Giao việc',
    TASK_MANAGE: 'Quản lý', TASK_UPDATE: 'Sửa', TASK_DELETE: 'Xóa', TASK_ASSIGN: 'Phân công',
    CAR_READ: 'Xem', CAR_VIEW: 'Xem', CAR_BOOK: 'Đặt xe', CAR_MANAGE: 'Điều xe',
    REQUEST_READ: 'Xem', REQUEST_VIEW: 'Xem', REQUEST_CREATE: 'Tạo', REQUEST_APPROVE: 'Duyệt',
    TIMEKEEPING_VIEW: 'Xem CC', TIMEKEEPING_MANAGE: 'Quản lý CC', TIMEKEEPING_EXPORT: 'Xuất CC',
};

// ─────────────────────────────────────────────
// Steps: 2-step wizard (merged Account+Profile)
// ─────────────────────────────────────────────
const STEPS = [
    { id: 1, label: 'Thông tin', icon: UserCircle, desc: 'Tài khoản & Hồ sơ' },
    { id: 2, label: 'Phân quyền', icon: Shield, desc: 'Roles & Permissions' },
];

function StepIndicator({ current }: { current: number }) {
    return (
        <div className="flex items-center gap-0 w-full">
            {STEPS.map((step, idx) => {
                const isDone = current > step.id;
                const isActive = current === step.id;
                const Icon = step.icon;
                return (
                    <React.Fragment key={step.id}>
                        <div className={cn(
                            'flex items-center gap-2.5 py-2 px-3 rounded-lg transition-all text-sm',
                            isActive ? 'bg-white/20 text-white shadow-sm' : isDone ? 'text-white/85' : 'text-white/45'
                        )}>
                            <div className={cn(
                                'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all',
                                isActive ? 'bg-white text-blue-700 shadow' :
                                    isDone ? 'bg-white/30 text-white' : 'bg-white/15 text-white/60'
                            )}>
                                {isDone ? <Check className="h-3.5 w-3.5" /> : step.id}
                            </div>
                            <div className="hidden sm:block">
                                <p className="font-semibold leading-none text-[16px]">{step.label}</p>
                                <p className={cn('text-[12px] mt-0.5', isActive ? 'text-white/80' : 'text-white/45')}>{step.desc}</p>
                            </div>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div className={cn('flex-1 h-px mx-1 rounded', isDone ? 'bg-white/50' : 'bg-white/20')} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────
// Password strength
// ─────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
    const score = useMemo(() => {
        let s = 0;
        if (password.length >= 8) s++;
        if (/[A-Z]/.test(password)) s++;
        if (/[0-9]/.test(password)) s++;
        if (/[^A-Za-z0-9]/.test(password)) s++;
        return s;
    }, [password]);

    const labels = ['Rất yếu', 'Yếu', 'Trung bình', 'Tốt', 'Rất mạnh'];
    const colors = ['bg-red-500', 'bg-red-400', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'];
    const textColors = ['text-red-600', 'text-red-500', 'text-orange-600', 'text-yellow-600', 'text-emerald-600'];
    const idx = password.length === 0 ? 0 : Math.max(1, score + 1);

    return (
        <div className="space-y-1 pt-1">
            <div className="flex gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all', i < score ? colors[idx - 1] : 'bg-muted')} />
                ))}
            </div>
            <p className={cn('text-xs font-medium', textColors[idx - 1] || 'text-muted-foreground')}>{labels[idx - 1]}</p>
        </div>
    );
}

// ─────────────────────────────────────────────
// Step 1: Account + Profile (merged)
// ─────────────────────────────────────────────
function Step1AccountProfile({ userId, editUser, form, setForm, employeeOptions, avatarError, setAvatarError }: {
    userId?: string | null;
    editUser: User | null;
    form: any;
    setForm: (v: any) => void;
    employeeOptions: { value: string; label: string }[];
    avatarError: boolean;
    setAvatarError: (v: boolean) => void;
}) {
    const [showPw, setShowPw] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const avatarLightbox = useAvatarLightbox();
    const selectedEmp = editUser?.employee;

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
        const pw = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        setForm((p: any) => ({ ...p, password: pw, confirmPassword: pw }));
        toast.success('Đã tạo mật khẩu ngẫu nhiên');
    };

    const copyPassword = () => {
        if (form.password) { navigator.clipboard.writeText(form.password); toast.success('Đã sao chép'); }
    };

    const pwMatch = form.password && form.confirmPassword
        ? form.password === form.confirmPassword : null;

    return (
        <div className="space-y-4">
            {/* ── Section: Tài khoản ── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <UserCircle className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Thông tin đăng nhập</h3>
                    <div className="flex-1 h-px bg-border ml-1" />
                </div>

                <div className="space-y-4">
                    {/* Row 1: Username + Email */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="username" required={!userId}>Tên đăng nhập</Label>
                            <Input
                                id="username" name="username"
                                required={!userId} disabled={!!userId}
                                value={userId ? (editUser?.username || '') : form.username}
                                onChange={e => setForm((p: any) => ({ ...p, username: e.target.value }))}
                                placeholder="ví dụ: nguyenvana"
                                autoComplete="off"
                                className={cn(userId && 'bg-muted/60 text-muted-foreground')}
                            />
                            {userId && <p className="text-xs text-muted-foreground">Không thể thay đổi sau khi tạo.</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="email" required>Email</Label>
                            <Input
                                id="email" name="email" type="email" required
                                autoComplete="off"
                                value={form.email}
                                onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))}
                                placeholder="user@example.com"
                                className={cn(
                                    form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
                                        ? 'border-destructive focus-visible:ring-destructive/20' : ''
                                )}
                            />
                            {form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <XCircle className="h-3.5 w-3.5" /> Email không đúng định dạng
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Password + Confirm — clean 2-column layout, no extra label content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="password" required={!userId}>
                                {userId ? 'Đổi mật khẩu (tuỳ chọn)' : 'Mật khẩu'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password" name="password"
                                    type={showPw ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    required={!userId} minLength={6}
                                    value={form.password}
                                    onChange={e => setForm((p: any) => ({ ...p, password: e.target.value }))}
                                    placeholder={userId ? 'Bỏ trống nếu không đổi' : 'Tối thiểu 6 ký tự'}
                                    className="pr-10"
                                />
                                <button type="button" onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="confirmPassword" required={!userId}>Xác nhận mật khẩu</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword" name="confirmPassword"
                                    type={showConfirm ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    required={!userId} minLength={6}
                                    value={form.confirmPassword}
                                    onChange={e => setForm((p: any) => ({ ...p, confirmPassword: e.target.value }))}
                                    placeholder="Nhập lại mật khẩu"
                                    className={cn('pr-10',
                                        pwMatch === false ? 'border-destructive focus-visible:ring-destructive/20' :
                                            pwMatch === true ? 'border-emerald-500 focus-visible:ring-emerald-500/20' : ''
                                    )}
                                />
                                <button type="button" onClick={() => setShowConfirm(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {pwMatch !== null && (
                                <p className={cn('text-xs flex items-center gap-1.5',
                                    pwMatch ? 'text-emerald-600' : 'text-destructive'
                                )}>
                                    {pwMatch
                                        ? <><CheckCircle2 className="h-3.5 w-3.5" /> Mật khẩu khớp</>
                                        : <><XCircle className="h-3.5 w-3.5" /> Mật khẩu không khớp</>}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Password helpers + strength — below both fields */}
                    {(form.password || !userId) && (
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                {form.password && <PasswordStrength password={form.password} />}
                            </div>
                            <div className="flex gap-1 shrink-0 mt-0.5">
                                <Button type="button" variant="outline" size="sm"
                                    className="h-7 text-xs gap-1.5 text-muted-foreground"
                                    onClick={generatePassword}>
                                    <RefreshCw className="h-3 w-3" /> Tạo ngẫu nhiên
                                </Button>
                                {form.password && (
                                    <Button type="button" variant="outline" size="sm"
                                        className="h-7 text-xs px-2 text-muted-foreground"
                                        onClick={copyPassword}>
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Section: Hồ sơ ── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <Link2 className="h-4 w-4 text-violet-600" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Hồ sơ & Liên kết</h3>
                    <div className="flex-1 h-px bg-border ml-1" />
                </div>

                <div className={cn('grid gap-6', userId && editUser?.employee ? 'grid-cols-1 md:grid-cols-[1fr_auto]' : 'grid-cols-1')}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Liên kết với hồ sơ Nhân viên</Label>
                            <Combobox
                                options={employeeOptions}
                                value={form.employeeId}
                                onValueChange={v => setForm((p: any) => ({ ...p, employeeId: v }))}
                                placeholder="Tìm và chọn nhân viên..."
                                searchPlaceholder="Tìm mã hoặc tên..."
                                emptyText="Không tìm thấy"
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                                Liên kết để đồng bộ tên, avatar và phòng ban từ hồ sơ nhân sự.
                            </p>
                        </div>

                        {/* Status (edit only) */}
                        {userId && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Trạng thái tài khoản
                                </Label>
                                <div className="grid grid-cols-2 gap-2 max-w-xs">
                                    {[
                                        { value: 'ACTIVE', label: 'Hoạt động', icon: CheckCircle2, color: 'peer-checked:border-emerald-500 peer-checked:bg-emerald-50/70 dark:peer-checked:bg-emerald-950/30 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-400' },
                                        { value: 'INACTIVE', label: 'Vô hiệu hóa', icon: XCircle, color: 'peer-checked:border-rose-500 peer-checked:bg-rose-50/70 dark:peer-checked:bg-rose-950/30 peer-checked:text-rose-700 dark:peer-checked:text-rose-400' },
                                    ].map(opt => (
                                        <label key={opt.value} className="cursor-pointer">
                                            <input type="radio" name="status" value={opt.value}
                                                checked={form.status === opt.value}
                                                onChange={() => setForm((p: any) => ({ ...p, status: opt.value }))}
                                                className="peer sr-only" />
                                            <div className={cn('flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 transition-all bg-muted/20 text-sm font-medium', opt.color)}>
                                                <opt.icon className="h-4 w-4 shrink-0" />
                                                <span>{opt.label}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Avatar preview (edit with employee linked) */}
                    {userId && editUser?.employee && (
                        <div className="flex flex-col items-center gap-2 pt-1">
                            <div className="h-20 w-20 rounded-2xl border-4 border-background shadow-md overflow-hidden">
                                <img
                                    src={editUser.employee.avatar && !avatarError
                                        ? `${process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001'}${editUser.employee.avatar}`
                                        : getAvatarUrl(editUser.employee.fullName || editUser.username || '?')}
                                    alt={editUser.employee.fullName}
                                    className="h-full w-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                    onError={() => setAvatarError(true)}
                                    onClick={() => editUser.employee?.avatar && !avatarError && avatarLightbox?.openLightbox(
                                        `${process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001'}${editUser.employee!.avatar}`,
                                        editUser.employee!.fullName
                                    )}
                                />
                            </div>
                            <div className="text-center">
                                <p className="font-semibold text-sm leading-tight">{editUser.employee.fullName}</p>
                                <p className="text-xs text-muted-foreground">{editUser.employee.employeeCode}</p>
                                {editUser.employee.department && (
                                    <p className="text-xs text-muted-foreground">{editUser.employee.department.name}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Admin confirmation (edit only) ── */}
            {userId && (
                <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 space-y-2">
                    <Label htmlFor="adminPassword" required className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <KeyRound className="h-4 w-4" /> Xác nhận thay đổi — Mật khẩu của bạn (Admin)
                    </Label>
                    <div className="relative">
                        <Input
                            id="adminPassword" name="adminPassword"
                            type={showAdmin ? 'text' : 'password'}
                            required={!!userId}
                            value={form.adminPassword}
                            onChange={e => setForm((p: any) => ({ ...p, adminPassword: e.target.value }))}
                            placeholder="Nhập mật khẩu tài khoản admin của bạn"
                            className="pr-10 border-amber-300 focus-visible:ring-amber-400/30"
                        />
                        <button type="button" onClick={() => setShowAdmin(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showAdmin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                        Bắt buộc nhập để xác nhận mọi thay đổi trên tài khoản này.
                    </p>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Step 2: Roles + Permissions Matrix
// ─────────────────────────────────────────────
function Step2Permissions({ roles, groupedPermissions, selectedRoleIds, setSelectedRoleIds, selectedPermissionIds, setSelectedPermissionIds }: {
    roles: Role[] | undefined;
    groupedPermissions: Record<string, Permission[]> | undefined;
    selectedRoleIds: string[];
    setSelectedRoleIds: (v: string[]) => void;
    selectedPermissionIds: string[];
    setSelectedPermissionIds: (v: string[]) => void;
}) {
    const [permSearch, setPermSearch] = useState('');

    const toggleRole = (id: string) => setSelectedRoleIds(
        selectedRoleIds.includes(id) ? selectedRoleIds.filter(r => r !== id) : [...selectedRoleIds, id]
    );
    const togglePerm = (id: string) => setSelectedPermissionIds(
        selectedPermissionIds.includes(id) ? selectedPermissionIds.filter(p => p !== id) : [...selectedPermissionIds, id]
    );
    const toggleModuleAll = (perms: Permission[], allSelected: boolean) => {
        const ids = perms.map(p => p.id);
        if (allSelected) setSelectedPermissionIds(selectedPermissionIds.filter(id => !ids.includes(id)));
        else setSelectedPermissionIds([...new Set([...selectedPermissionIds, ...ids])]);
    };

    const filteredGroups = useMemo(() => {
        if (!groupedPermissions) return {};
        const q = permSearch.toLowerCase().trim();
        if (!q) return groupedPermissions;
        return Object.fromEntries(
            Object.entries(groupedPermissions)
                .map(([mod, perms]) => [mod, perms.filter(p =>
                    (PERMISSION_LABELS[p.code] || p.code).toLowerCase().includes(q) ||
                    (MODULE_LABELS[mod] || mod).toLowerCase().includes(q)
                )])
                .filter(([, perms]) => (perms as Permission[]).length > 0)
        );
    }, [groupedPermissions, permSearch]);

    return (
        <div className="space-y-2">
            {/* Roles */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <Users className="h-4 w-4 text-violet-600" />
                    </div>
                    <Label className="text-lg font-semibold">Vai trò (Roles)</Label>
                    {selectedRoleIds.length > 0 && (
                        <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/30">
                            {selectedRoleIds.length} đã chọn
                        </Badge>
                    )}
                </div>
                {!roles ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {roles.map(role => {
                            const active = selectedRoleIds.includes(role.id);
                            return (
                                <button key={role.id} type="button" onClick={() => toggleRole(role.id)}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                                        active
                                            ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 shadow-sm'
                                            : 'border-border hover:border-violet-300 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 text-muted-foreground hover:text-foreground'
                                    )}>
                                    <div className={cn('h-4 w-4 rounded border flex items-center justify-center transition-all',
                                        active ? 'bg-violet-600 border-violet-600' : 'border-muted-foreground/30'
                                    )}>
                                        {active && <Check className="h-2.5 w-2.5 text-white" />}
                                    </div>
                                    {role.name}
                                    <span className="text-[10px] font-mono opacity-60">{role.code}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Permissions matrix */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-blue-600" />
                        </div>
                        <Label className="text-lg font-semibold">Quyền mở rộng (Permissions)</Label>
                        {selectedPermissionIds.length > 0 && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30">
                                {selectedPermissionIds.length} đã chọn
                            </Badge>
                        )}
                    </div>
                    {selectedPermissionIds.length > 0 && (
                        <Button type="button" variant="ghost" size="sm"
                            className="text-xs text-destructive h-7"
                            onClick={() => setSelectedPermissionIds([])}>
                            Bỏ chọn tất cả
                        </Button>
                    )}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" value={permSearch} onChange={e => setPermSearch(e.target.value)}
                        placeholder="Tìm module hoặc quyền..."
                        className="w-full h-9 pl-9 pr-3 text-sm border border-border rounded-lg bg-background outline-none focus:ring-1 focus:ring-primary/30" />
                </div>

                {!groupedPermissions ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-4 px-3 border rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách quyền...
                    </div>
                ) : Object.keys(filteredGroups).length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">Không tìm thấy</div>
                ) : (
                    <div className="border rounded-xl overflow-hidden shadow-sm">
                        <div className="grid grid-cols-[160px_1fr] bg-muted/50 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            <div className="px-4 py-2.5 border-r">Module</div>
                            <div className="px-4 py-2.5">Quyền hạn</div>
                        </div>
                        <div className="divide-y max-h-[400px] overflow-y-auto">
                            {Object.entries(filteredGroups).map(([mod, perms]) => {
                                const allSelected = (perms as Permission[]).every(p => selectedPermissionIds.includes(p.id));
                                const someSelected = (perms as Permission[]).some(p => selectedPermissionIds.includes(p.id));
                                return (
                                    <div key={mod} className="grid grid-cols-[160px_1fr] hover:bg-muted/10 transition-colors">
                                        <div className="px-4 py-3 border-r bg-muted/5 flex flex-col justify-center gap-1">
                                            <span className="font-semibold text-sm text-foreground/90 leading-tight">
                                                {MODULE_LABELS[mod] || mod}
                                            </span>
                                            <button type="button"
                                                onClick={() => toggleModuleAll(perms as Permission[], allSelected)}
                                                className={cn('text-[10px] font-medium self-start px-1.5 py-0.5 rounded transition-colors',
                                                    allSelected ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/20' :
                                                        someSelected ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/20' :
                                                            'text-muted-foreground hover:text-foreground hover:bg-muted'
                                                )}>
                                                {allSelected ? '✓ Tất cả' : someSelected ? '● Một số' : 'Chọn tất cả'}
                                            </button>
                                        </div>
                                        <div className="px-3 py-2.5">
                                            <div className="flex flex-wrap gap-1.5">
                                                {(perms as Permission[]).map(perm => {
                                                    const active = selectedPermissionIds.includes(perm.id);
                                                    return (
                                                        <button key={perm.id} type="button" onClick={() => togglePerm(perm.id)}
                                                            className={cn(
                                                                'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all font-medium',
                                                                active
                                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                                    : 'border-border hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-muted-foreground hover:text-foreground'
                                                            )}>
                                                            {active && <Check className="h-2.5 w-2.5" />}
                                                            {PERMISSION_LABELS[perm.code] || perm.description || perm.code}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <p className="text-xs text-amber-600 dark:text-amber-400 border-l-2 border-amber-500 pl-2">
                    Quyền mở rộng được cộng dồn với quyền từ Vai trò (Roles) đã chọn ở trên.
                </p>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
interface UserFormProps { userId?: string | null; returnUrl?: string; }

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UserForm({ userId, returnUrl = '/settings/users' }: UserFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [avatarError, setAvatarError] = useState(false);

    const [form, setForm] = useState({
        username: '', email: '', password: '', confirmPassword: '',
        adminPassword: '', employeeId: '', status: 'ACTIVE',
    });
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);

    // Data fetching
    const { data: userResponse, isLoading: isLoadingUser } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => apiGet<User>(`/users/${userId}`),
        enabled: !!userId,
    });
    const editUser = userResponse || null;

    const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: () => apiGet<Role[]>('/roles') });
    const { data: groupedPermissions } = useQuery({
        queryKey: ['permissions-grouped'],
        queryFn: () => apiGet<Record<string, Permission[]>>('/roles/permissions/grouped'),
    });
    const { data: employeesData } = useQuery({
        queryKey: ['employees-all'],
        queryFn: () => apiGet<{ data: any[] }>('/employees?limit=1000'),
    });

    const employeeOptions = useMemo(() => [
        { value: '', label: '-- Không liên kết --' },
        ...(employeesData?.data || []).map(emp => ({ value: emp.id, label: `${emp.employeeCode} - ${emp.fullName}` })),
    ], [employeesData]);

    // Pre-fill form when editUser loads
    useEffect(() => {
        if (editUser) {
            setForm(p => ({
                ...p,
                email: editUser.email || '',
                employeeId: editUser.employee?.id || '',
                status: editUser.status || 'ACTIVE',
            }));
            setSelectedRoleIds(editUser.roles?.map(r => r.id) || []);
            setSelectedPermissionIds(editUser.permissions?.map(p => p.id) || []);
            setAvatarError(false);
        }
    }, [editUser]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: any) => apiPost('/users', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Tạo người dùng thành công!');
            router.push(returnUrl);
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi khi tạo'),
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => apiPatch(`/users/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Cập nhật thành công!');
            router.push(returnUrl);
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Lỗi khi cập nhật'),
    });

    const isSubmitting = createMutation.isPending || updateMutation.isPending;
    const [isVerifying, setIsVerifying] = useState(false);

    // Validation
    const validateStep = (s: number): boolean => {
        if (s === 1) {
            if (!userId && !form.username.trim()) { toast.error('Vui lòng nhập tên đăng nhập'); return false; }
            if (!form.email.trim()) { toast.error('Vui lòng nhập email'); return false; }
            if (!EMAIL_REGEX.test(form.email)) { toast.error('Email không đúng định dạng (ví dụ: user@sunplast.vn)'); return false; }
            if (!userId && !form.password) { toast.error('Vui lòng nhập mật khẩu'); return false; }
            if (form.password && form.password.length < 6) { toast.error('Mật khẩu phải ít nhất 6 ký tự'); return false; }
            if (form.password && form.password !== form.confirmPassword) { toast.error('Mật khẩu xác nhận không khớp'); return false; }
            if (userId && !form.adminPassword) { toast.error('Vui lòng nhập mật khẩu xác nhận (Admin) trước khi tiếp tục'); return false; }
            if (userId && form.adminPassword.length < 6) { toast.error('Mật khẩu Admin phải ít nhất 6 ký tự'); return false; }
        }
        return true;
    };

    const handleNext = async () => {
        if (!validateStep(step)) return;

        // In edit mode at step 1: verify admin password first
        if (isEditMode && step === 1 && form.adminPassword) {
            try {
                setIsVerifying(true);
                await apiPost('/users/verify-admin-password', {
                    adminPassword: form.adminPassword
                });
                setStep(s => s + 1);
            } catch (error: any) {
                // The api-client already triggers an error toast using sonner
                console.error("Verification failed", error);
            } finally {
                setIsVerifying(false);
            }
        } else {
            setStep(s => s + 1);
        }
    };
    const handleBack = () => setStep(s => s - 1);

    const handleSubmit = () => {
        if (!validateStep(step)) return;
        if (userId && editUser) {
            const data: any = {
                email: form.email, status: form.status,
                employeeId: form.employeeId || null,
                adminPassword: form.adminPassword,
                roleIds: selectedRoleIds,
                permissionIds: selectedPermissionIds,
            };
            if (form.password) data.password = form.password;
            updateMutation.mutate({ id: editUser.id, data });
        } else {
            createMutation.mutate({
                username: form.username,
                email: form.email,
                password: form.password,
                employeeId: form.employeeId || undefined,
                roleIds: selectedRoleIds,
                permissionIds: selectedPermissionIds,
            });
        }
    };

    // Loading screen
    if (userId && isLoadingUser) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const isEditMode = !!userId;
    const headerTitle = isEditMode
        ? (isLoadingUser ? 'Chỉnh sửa người dùng' : (editUser?.employee?.fullName || editUser?.username || 'Chỉnh sửa người dùng'))
        : 'Thêm mới người dùng';
    const headerSubtitle = isEditMode
        ? (isLoadingUser ? 'Đang tải...' : `@${editUser?.username}`)
        : 'Tạo tài khoản đăng nhập hệ thống';

    return (
        <div className="h-full overflow-y-auto">
            <div className="w-full px-2 py-2 space-y-2">
                {/* ── Gradient header with step indicator ── */}
                <div className={cn(
                    'rounded-2xl shadow-lg overflow-hidden',
                    isEditMode
                        ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600'
                        : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600'
                )}>
                    <div className="px-6 pt-4 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => router.push(returnUrl)}
                                    className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors text-white">
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <div>
                                    <div className="flex items-center gap-2">
                                        {isEditMode && <Pencil className="h-4 w-4 text-white/80" />}
                                        <h1 className="text-white font-bold text-lg leading-tight">{headerTitle}</h1>
                                        {isEditMode && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-white/20 text-white">
                                                ✏️ Chỉnh sửa
                                            </span>
                                        )}
                                    </div>
                                    {isEditMode && editUser?.username && (
                                        <p className="text-white/60 text-xs mt-0.5">@{editUser.username} — Cập nhập thông tin & phân quyền</p>
                                    )}
                                    {!isEditMode && (
                                        <p className="text-white/65 text-xs mt-0.5">Tạo tài khoản đăng nhập hệ thống</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {step > 1 && (
                                    <Button type="button" variant="ghost" onClick={handleBack}
                                        className="text-white/80 hover:text-white hover:bg-white/15 gap-1.5">
                                        <ChevronLeft className="h-4 w-4" /> Quay lại
                                    </Button>
                                )}
                                {step < STEPS.length ? (
                                    <Button type="button" onClick={handleNext} disabled={isVerifying}
                                        className="bg-white text-blue-700 hover:bg-white/90 shadow font-semibold gap-1.5">
                                        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                        Tiếp theo <ChevronRight className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button type="button" onClick={handleSubmit} disabled={isSubmitting}
                                        className="bg-white text-blue-700 hover:bg-white/90 shadow font-semibold gap-1.5 px-6">
                                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {userId ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="px-6 pb-4">
                        <StepIndicator current={step} />
                    </div>
                </div>

                {/* ── Step content ── */}
                <Card className="shadow-sm border rounded-2xl">
                    <CardContent className="px-6 py-0 md:px-4">
                        {step === 1 && (
                            <Step1AccountProfile
                                userId={userId} editUser={editUser}
                                form={form} setForm={setForm}
                                employeeOptions={employeeOptions}
                                avatarError={avatarError} setAvatarError={setAvatarError}
                            />
                        )}
                        {step === 2 && (
                            <Step2Permissions
                                roles={roles}
                                groupedPermissions={groupedPermissions}
                                selectedRoleIds={selectedRoleIds}
                                setSelectedRoleIds={setSelectedRoleIds}
                                selectedPermissionIds={selectedPermissionIds}
                                setSelectedPermissionIds={setSelectedPermissionIds}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* ── Bottom nav ── */}
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Bước {step} / {STEPS.length}</p>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => router.push(returnUrl)}>Hủy bỏ</Button>
                        {step > 1 && (
                            <Button type="button" variant="outline" onClick={handleBack} className="gap-1">
                                <ChevronLeft className="h-4 w-4" /> Quay lại
                            </Button>
                        )}
                        {step < STEPS.length ? (
                            <Button type="button" onClick={handleNext} disabled={isVerifying}
                                className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Tiếp theo <ChevronRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}
                                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-6">
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {userId ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
