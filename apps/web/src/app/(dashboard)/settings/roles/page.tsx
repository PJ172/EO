"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { MoreHorizontal, Plus, Search, Filter, FileDown, ArrowUpDown, ChevronUp, ChevronDown, Trash2, Upload, Grid3X3, LayoutList, BarChart3, Loader2, Info, ShieldCheck, Save } from "lucide-react";
import { toast } from "sonner";
import { SearchBar } from "@/components/ui/search-bar";
import { getAccessToken } from "@/lib/api-client";
import { AdvancedPermissionMatrix, PermissionMatrixSkeleton } from "@/components/roles/advanced-permission-matrix";
import { RoleStatsCard } from "@/components/roles/role-stats-card";
import { ModernRoleCard, RoleCardSkeleton } from "@/components/roles/modern-role-card";
import { useRoles, useDeleteRole, useRestoreRole, useForceDeleteRole, type Role, type Permission } from "@/services/roles.service";
import { PageHeader } from "@/components/ui/page-header";
import { useRouter } from "next/navigation";
import { ImportRoleDialog } from "@/components/roles/import-role-dialog";

export default function RolesPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [importOpen, setImportOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("list");

    // Fetch roles
    const { data: roles, isLoading, refetch } = useRoles(false);

    // Fetch permissions grouped
    const { data: permissionsGrouped } = useQuery({
        queryKey: ["permissions-grouped"],
        queryFn: () => apiGet<Record<string, Permission[]>>("/roles/permissions/grouped"),
    });



    // Update permissions mutation
    const updatePermsMutation = useMutation({
        mutationFn: ({ id, permissionIds }: { id: string; permissionIds: string[] }) =>
            apiPost(`/roles/${id}/permissions`, { permissionIds }),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            toast.success("Cập nhật quyền thành công!");
        },
        onError: () => toast.error("Lỗi khi cập nhật quyền"),
    });

    // Role mutations
    const deleteMutation = useDeleteRole();

    const handleDeleteRole = async (role: Role) => {
        if (confirm(`Xác nhận xóa vai trò "${role.name}"?`)) {
            try {
                await deleteMutation.mutateAsync(role.id);
                toast.success("Đã xóa vai trò");
            } catch (error: any) {
                toast.error(error?.response?.data?.message || "Lỗi khi xóa vai trò");
            }
        }
    };

    const handleExport = async () => {
        try {
            const token = getAccessToken();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/roles/export/excel`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Export_Vaitro.xlsx";
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Xuất file Excel thành công!");
        } catch {
            toast.error("Lỗi khi xuất file");
        }
    };



    // Handle permission update from matrix
    const handleMatrixPermissionUpdate = async (roleId: string, permissionIds: string[]) => {
        await updatePermsMutation.mutateAsync({ id: roleId, permissionIds });
    };

    // Filter roles
    const filteredRoles = roles?.filter(r =>
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.code.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];


    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <PageHeader
                    title="Quản lý Vai trò"
                    icon={
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-700">
                            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                        </div>
                    }
                    className="mb-0 border-none bg-transparent p-0 shadow-none"
                    backHref="/settings"
                    onRefresh={refetch}
                    isRefreshing={isLoading}
                    search={
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <SearchBar
                                    placeholder="Tìm kiếm vai trò..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    }
                >
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleExport} className="h-9 bg-white/80 backdrop-blur-sm border-border/50 hover:bg-slate-100 transition-all rounded-xl shadow-sm font-semibold gap-2">
                            <FileDown className="h-4 w-4 text-muted-foreground" />
                            Xuất Excel
                        </Button>
                        <Button variant="outline" onClick={() => setImportOpen(true)} className="h-9 bg-white/80 backdrop-blur-sm border-border/50 hover:bg-slate-100 transition-all rounded-xl shadow-sm font-semibold gap-2">
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            Nhập Excel
                        </Button>

                        <ImportRoleDialog
                            open={importOpen}
                            onOpenChange={setImportOpen}
                            onSuccess={() => {
                                setImportOpen(false);
                                refetch();
                            }}
                        />
                        <Button onClick={() => router.push('/settings/roles/new')} className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 px-5 rounded-xl font-semibold">
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm mới
                        </Button>
                    </div>
                </PageHeader>
            </div>

            <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full max-w-2xl grid-cols-3">
                    <TabsTrigger value="list" className="flex items-center gap-2">
                        <LayoutList className="h-4 w-4" />
                        Danh sách
                    </TabsTrigger>
                    <TabsTrigger value="matrix" className="flex items-center gap-2">
                        <Grid3X3 className="h-4 w-4" />
                        Ma trận quyền
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Thống kê
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-6">

                    {/* Roles Grid */}
                    {isLoading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map(i => <RoleCardSkeleton key={i} />)}
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredRoles.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-lg border">
                                    Chưa có vai trò nào.
                                </div>
                            ) : (
                                filteredRoles.map((role) => (
                                    <ModernRoleCard
                                        key={role.id}
                                        role={role}
                                        onEdit={(role) => router.push(`/settings/roles/${role.id}/edit`)}
                                        onDelete={handleDeleteRole}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="matrix">
                    {isLoading ? (
                        <PermissionMatrixSkeleton />
                    ) : (
                        <AdvancedPermissionMatrix
                            roles={roles || []}
                            permissionsGrouped={permissionsGrouped || {}}
                            onUpdate={async (roleId, permissionIds) => {
                                await updatePermsMutation.mutateAsync({ id: roleId, permissionIds });
                            }}
                        />
                    )}
                </TabsContent>

                <TabsContent value="stats">
                    <RoleStatsCard
                        roles={roles || []}
                        permissionsGrouped={permissionsGrouped || {}}
                        isLoading={isLoading}
                    />
                </TabsContent>
            </Tabs>
            </div>
        </div>
    );
}

