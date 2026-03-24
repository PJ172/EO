"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Shield, Users, Lock, Pencil, Trash2, Crown, Briefcase, UserCog, RotateCcw } from "lucide-react";

import { type Role, type Permission } from "@/services/roles.service";

interface ModernRoleCardProps {
    role: Role;
    onEdit?: (role: Role) => void;
    onDelete?: (role: Role) => void;
    onRestore?: (role: Role) => void;
    onForceDelete?: (role: Role) => void;
    isDeleted?: boolean;
}

// Color scheme based on role code
const getRoleColors = (code: string) => {
    const schemes: Record<string, { gradient: string; icon: string; badge: string }> = {
        'ADMIN': {
            gradient: 'from-red-500/20 via-red-400/10 to-transparent',
            icon: 'text-red-600 bg-red-100',
            badge: 'bg-red-100 text-red-700 border-red-200',
        },
        'MANAGER': {
            gradient: 'from-blue-500/20 via-blue-400/10 to-transparent',
            icon: 'text-blue-600 bg-blue-100',
            badge: 'bg-blue-100 text-blue-700 border-blue-200',
        },
        'HR': {
            gradient: 'from-purple-500/20 via-purple-400/10 to-transparent',
            icon: 'text-purple-600 bg-purple-100',
            badge: 'bg-purple-100 text-purple-700 border-purple-200',
        },
        'EMPLOYEE': {
            gradient: 'from-green-500/20 via-green-400/10 to-transparent',
            icon: 'text-green-600 bg-green-100',
            badge: 'bg-green-100 text-green-700 border-green-200',
        },
    };
    return schemes[code] || {
        gradient: 'from-slate-500/20 via-slate-400/10 to-transparent',
        icon: 'text-slate-600 bg-slate-100',
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
    };
};

const getRoleIcon = (code: string) => {
    switch (code) {
        case 'ADMIN': return Crown;
        case 'MANAGER': return Briefcase;
        case 'HR': return UserCog;
        default: return Shield;
    }
};

export function ModernRoleCard({ role, onEdit, onDelete, onRestore, onForceDelete, isDeleted }: ModernRoleCardProps) {
    const colors = getRoleColors(role.code);
    const RoleIcon = getRoleIcon(role.code);

    // Get unique modules from permissions
    const modules = [...new Set(role.permissions.map(p => p.module).filter(Boolean))] as string[];

    return (
        <Card className={cn(
            "relative overflow-hidden group transition-all duration-300",
            "hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1",
            "border-2 hover:border-primary/20"
        )}>
            {/* Gradient Background */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-70 transition-opacity",
                colors.gradient
            )} />

            <CardHeader className="relative pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2.5 rounded-xl", colors.icon)}>
                            <RoleIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg leading-tight">{role.name}</CardTitle>
                            <Badge variant="outline" className={cn("mt-1 font-mono text-[10px]", colors.badge)}>
                                {role.code}
                            </Badge>
                        </div>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">

                        {!isDeleted && onEdit && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => onEdit(role)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Chỉnh sửa</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}

                        {role.code !== 'ADMIN' && !isDeleted && onDelete && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => onDelete(role)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Xóa</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}

                        {isDeleted && onRestore && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => onRestore(role)}>
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Khôi phục</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {isDeleted && onForceDelete && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onForceDelete(role)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Xóa vĩnh viễn</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="relative space-y-4">
                {/* Description */}
                {role.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{role.description}</p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-6">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className={`flex items-center gap-2 transition-colors ${!isDeleted && onEdit ? "cursor-pointer hover:text-primary" : ""}`}
                                    onClick={() => !isDeleted && onEdit && onEdit(role)}
                                >
                                    <div className="p-1.5 bg-primary/10 rounded-md">
                                        <Lock className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <div>
                                        <span className="font-semibold">{role.permissionsCount}</span>
                                        <span className="text-muted-foreground text-sm ml-1">quyền</span>
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>Click để xem chi tiết quyền</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-500/10 rounded-md">
                            <Users className="h-3.5 w-3.5 text-purple-600" />
                        </div>
                        <div>
                            <span className="font-semibold">{role.usersCount}</span>
                            <span className="text-muted-foreground text-sm ml-1">người dùng</span>
                        </div>
                    </div>
                </div>

                {/* Module Tags */}
                {modules.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                        {modules.slice(0, 4).map(mod => (
                            <Badge
                                key={mod}
                                variant="secondary"
                                className="text-[10px] px-2 py-0.5"
                            >
                                {getModuleLabel(mod)}
                            </Badge>
                        ))}
                        {modules.length > 4 && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                +{modules.length - 4}
                            </Badge>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function RoleCardSkeleton() {
    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-6">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                </div>
                <div className="flex gap-2 pt-2 border-t">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                </div>
            </CardContent>
        </Card>
    );
}

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

function getModuleLabel(mod: string): string {
    return MODULE_LABELS[mod] || mod;
}
