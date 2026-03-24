"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Shield,
    ShieldCheck,
    ShieldAlert,
    Check,
    X,
    Save,
    Loader2,
    ChevronDown,
    ChevronRight,
    Search,
    Info
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Permission {
    id: string;
    code: string;
    description: string;
    module?: string;
}

interface User {
    id: string;
    username: string;
    email: string;
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
    permissions?: { id: string; code: string; description?: string; module?: string }[];
}

interface UserPermissionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
    permissionsGrouped?: Record<string, Permission[]>;
    onUpdate: (userId: string, permissionIds: string[]) => Promise<void>;
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

export function UserPermissionsDialog({
    open,
    onOpenChange,
    user,
    permissionsGrouped,
    onUpdate,
}: UserPermissionsDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    const [localPermissions, setLocalPermissions] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Permissions from roles (inherited)
    const rolePermissions = useMemo(() => {
        const perms = new Set<string>();
        user?.roles.forEach(role => {
            role.permissions?.forEach(rp => {
                perms.add(rp.permission.id);
            });
        });
        return perms;
    }, [user]);

    // Effective permissions (inherited + overrides)
    const effectivePermissions = useMemo(() => {
        const combined = new Set(rolePermissions);
        localPermissions.forEach(p => combined.add(p));
        return combined;
    }, [rolePermissions, localPermissions]);

    // Initialize local permissions from user overrides
    useEffect(() => {
        if (user && open) {
            setLocalPermissions(new Set(user.permissions?.map(p => p.id) || []));
            // Expand modules that have overrides
            const modulesToExpand = new Set<string>();
            user.permissions?.forEach(p => {
                if (p.module) modulesToExpand.add(p.module as string);
            });
            // Also expand modules that have role permissions
            permissionsGrouped && Object.keys(permissionsGrouped).forEach(module => {
                const perms = permissionsGrouped[module];
                if (perms.some(p => rolePermissions.has(p.id))) {
                    modulesToExpand.add(module);
                }
            });
            setExpandedModules(modulesToExpand);
        }
    }, [user, open, rolePermissions, permissionsGrouped]);

    const handleTogglePermission = (permId: string) => {
        setLocalPermissions(prev => {
            const next = new Set(prev);
            if (next.has(permId)) {
                next.delete(permId);
            } else {
                next.add(permId);
            }
            return next;
        });
    };

    const handleToggleModule = (module: string, perms: Permission[]) => {
        const allSelected = perms.every(p => localPermissions.has(p.id));
        setLocalPermissions(prev => {
            const next = new Set(prev);
            if (allSelected) {
                perms.forEach(p => next.delete(p.id));
            } else {
                perms.forEach(p => next.add(p.id));
            }
            return next;
        });
    };

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

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await onUpdate(user.id, Array.from(localPermissions));
            onOpenChange(false);
        } finally {
            setIsSaving(false);
        }
    };

    const hasChanges = useMemo(() => {
        if (!user) return false;
        const current = Array.from(localPermissions).sort();
        const original = (user.permissions?.map(p => p.id) || []).sort();
        return JSON.stringify(current) !== JSON.stringify(original);
    }, [user, localPermissions]);

    const filteredModules = useMemo(() => {
        if (!searchQuery) return Object.keys(permissionsGrouped || {});

        return Object.keys(permissionsGrouped || {}).filter(module => {
            const moduleName = MODULE_LABELS[module] || module;
            if (moduleName.toLowerCase().includes(searchQuery.toLowerCase())) return true;

            return (permissionsGrouped?.[module] || []).some(p =>
                p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
        });
    }, [permissionsGrouped, searchQuery]);

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl">Quyền hạn cá nhân: {user.username}</DialogTitle>
                            <DialogDescription>
                                Quản lý các quyền gán trực tiếp cho nhân viên này (Overrides).
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-6 py-2 flex items-center gap-4 border-y bg-muted/30">
                    <div className="flex-1 relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm quyền hoặc module..."
                            className="pl-8 h-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="preview-mode" className="text-xs font-semibold whitespace-nowrap">Chế độ xem trước</Label>
                            <Checkbox
                                id="preview-mode"
                                checked={showPreview}
                                onCheckedChange={(val) => setShowPreview(!!val)}
                                className="h-4 w-4 border-primary"
                            />
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 whitespace-nowrap">
                            {effectivePermissions.size} quyền hiệu lực
                        </Badge>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-6 pt-2">
                    <div className="space-y-4">
                        {filteredModules.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <Search className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                <p>Không tìm thấy quyền nào phù hợp</p>
                            </div>
                        ) : (
                            filteredModules.map(module => {
                                const perms = permissionsGrouped?.[module] || [];
                                const isExpanded = expandedModules.has(module);
                                const selectedInModule = perms.filter(p => localPermissions.has(p.id)).length;

                                return (
                                    <div key={module} className="border rounded-lg overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md">
                                        <div
                                            className={cn(
                                                "flex items-center justify-between p-3 cursor-pointer select-none",
                                                isExpanded ? "bg-muted/50 border-b" : "bg-card"
                                            )}
                                            onClick={() => toggleModuleExpansion(module)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="bg-background p-1.5 rounded-md border shadow-sm">
                                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm">{MODULE_LABELS[module] || module}</h4>
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{module}</p>
                                                </div>
                                                {selectedInModule > 0 && (
                                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] px-1.5">
                                                        {selectedInModule} / {perms.length}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 text-[11px]"
                                                    onClick={() => handleToggleModule(module, perms)}
                                                >
                                                    {selectedInModule === perms.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                                                </Button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="p-1 bg-card/50">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                                    {perms.map(perm => (
                                                        <div
                                                            key={perm.id}
                                                            className={cn(
                                                                "flex items-center gap-3 p-2.5 rounded-md border transition-all cursor-pointer group",
                                                                localPermissions.has(perm.id)
                                                                    ? "bg-primary/5 border-primary/30 ring-1 ring-primary/10"
                                                                    : "border-transparent hover:bg-muted/80"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!rolePermissions.has(perm.id)) {
                                                                    handleTogglePermission(perm.id);
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex items-center justify-center">
                                                                {rolePermissions.has(perm.id) ? (
                                                                    <div className="h-4 w-4 rounded-sm bg-primary flex items-center justify-center">
                                                                        <Check className="h-3 w-3 text-white" />
                                                                    </div>
                                                                ) : (
                                                                    <Checkbox
                                                                        checked={localPermissions.has(perm.id)}
                                                                        onCheckedChange={() => handleTogglePermission(perm.id)}
                                                                        className="h-4 w-4"
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={cn(
                                                                        "text-sm font-medium truncate",
                                                                        rolePermissions.has(perm.id) ? "text-primary/70" : ""
                                                                    )}>{perm.code}</span>
                                                                    {rolePermissions.has(perm.id) && (
                                                                        <TooltipProvider>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[9px] px-1 py-0 pointer-events-auto">
                                                                                        Từ vai trò
                                                                                    </Badge>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p className="text-[10px]">Quyền này được kế thừa từ các vai trò của người dùng.</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    )}
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="text-muted-foreground/40 hover:text-primary transition-colors cursor-help p-0.5">
                                                                                    <Info className="h-3 w-3" />
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent className="max-w-[200px]">
                                                                                <p className="text-xs">{perm.description}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                </div>
                                                                {perm.description && (
                                                                    <p className="text-[11px] text-muted-foreground truncate line-clamp-1">
                                                                        {perm.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>

                <div className="p-6 pt-4 border-t bg-muted/20 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5" />
                        <span>Các quyền từ vai trò sẽ luôn được áp dụng tự động.</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving}
                        >
                            Hủy
                        </Button>
                        <Button
                            disabled={!hasChanges || isSaving}
                            onClick={handleSave}
                            className="min-w-[120px]"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Lưu thay đổi
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
