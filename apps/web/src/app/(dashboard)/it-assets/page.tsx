'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Monitor, Search, Plus, Package, Wrench, UserCheck, BarChart3, ArrowRight, Shield, QrCode, MoreHorizontal, Trash2, RotateCcw, Laptop } from 'lucide-react';
import { apiClient as api } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { useITAssets, useDeleteITAsset } from '@/services/it-assets.service';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    AVAILABLE: { label: 'Sẵn sàng', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    IN_USE: { label: 'Đang sử dụng', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    MAINTENANCE: { label: 'Bảo trì', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    RETIRED: { label: 'Thanh lý', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
    LOST: { label: 'Mất', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

const CONDITION_CONFIG: Record<string, { label: string; emoji: string }> = {
    NEW: { label: 'Mới', emoji: '✨' },
    GOOD: { label: 'Tốt', emoji: '👍' },
    FAIR: { label: 'Trung bình', emoji: '👌' },
    POOR: { label: 'Kém', emoji: '⚠️' },
    BROKEN: { label: 'Hỏng', emoji: '❌' },
};

export default function ITAssetsPage() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [activeTab, setActiveTab] = useState('list');

    // Fetch assets
    const { data: assetsData, isLoading } = useITAssets({
        search: search || undefined,
        status: statusFilter || undefined,
        limit: 50,
    });

    const deleteMutation = useDeleteITAsset();

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Bạn có chắc muốn xóa tài sản này?')) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Đã xóa tài sản');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Lỗi khi xóa');
        }
    };

    // Fetch statistics
    const { data: stats } = useQuery({
        queryKey: ['it-assets-stats'],
        queryFn: () => api.get('/it-assets/statistics').then(r => r.data),
    });

    // Fetch categories
    const { data: categories = [] } = useQuery({
        queryKey: ['asset-categories'],
        queryFn: () => api.get('/it-assets/categories').then(r => r.data),
    });

    // Fetch employees for assignment
    const { data: employeesData } = useQuery({
        queryKey: ['employees-mini-list'],
        queryFn: () => api.get('/employees', { params: { limit: 1000 } }).then(r => r.data),
    });
    const employees = employeesData?.data || [];
    const assets = assetsData?.data || [];

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
            <PageHeader
                title="Quản lý Tài sản IT"
                icon={
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-lime-500 to-lime-700">
                        <Laptop className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                    </div>
                }
                className="mb-0 border-none bg-transparent p-0 shadow-none"
            />
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 custom-scrollbar pr-1 pb-2">

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/30 border-blue-200/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg text-white">
                                <Package className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Tổng tài sản</p>
                                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                {stats?.byStatus?.slice(0, 3).map((s: any) => {
                    const cfg = STATUS_CONFIG[s.status] || { label: s.status, color: '' };
                    return (
                        <Card key={s.status} className="border-muted">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${cfg.color}`}>
                                        {s.status === 'IN_USE' ? <UserCheck className="h-5 w-5" /> :
                                            s.status === 'AVAILABLE' ? <Shield className="h-5 w-5" /> :
                                                <Wrench className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{cfg.label}</p>
                                        <p className="text-2xl font-bold">{s.count}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="list">Danh sách</TabsTrigger>
                    <TabsTrigger value="categories">Danh mục</TabsTrigger>
                </TabsList>

                {/* ASSET LIST */}
                <TabsContent value="list" className="space-y-4">
                    {/* Filters */}
                    <div className="flex gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm tài sản..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm bg-background"
                        >
                            <option value="">Tất cả trạng thái</option>
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Table */}
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                                    <TableRow>
                                        <TableHead>Mã</TableHead>
                                        <TableHead>Tên thiết bị</TableHead>
                                        <TableHead>Danh mục</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead>Tình trạng</TableHead>
                                        <TableHead>Người sử dụng</TableHead>
                                        <TableHead>Phòng ban</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assets.map((asset: any) => {
                                        const statusCfg = STATUS_CONFIG[asset.status] || { label: asset.status, color: '' };
                                        const condCfg = CONDITION_CONFIG[asset.condition] || { label: asset.condition, emoji: '' };
                                        return (
                                            <TableRow
                                                key={asset.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => {
                                                    router.push(`/it-assets/${asset.id}`);
                                                }}
                                            >
                                                <TableCell className="font-mono text-xs">{asset.code}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{asset.name}</div>
                                                        {asset.brand && (
                                                            <div className="text-xs text-muted-foreground">{asset.brand} {asset.model || ''}</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{asset.category?.name}</TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                                        {statusCfg.label}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{condCfg.emoji} {condCfg.label}</TableCell>
                                                <TableCell>{asset.assignedTo?.fullName || '—'}</TableCell>
                                                <TableCell>{asset.department?.name || '—'}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={(e) => handleDelete(e as unknown as React.MouseEvent, asset.id)} className="text-red-500 focus:text-red-500 cursor-pointer">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Xóa
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {assets.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                {isLoading ? 'Đang tải...' : 'Chưa có tài sản nào'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* CATEGORIES */}
                <TabsContent value="categories" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {categories.map((cat: any) => (
                            <Card key={cat.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                                <CardContent className="p-4 text-center">
                                    <div className="text-3xl mb-2">
                                        {cat.icon || '📦'}
                                    </div>
                                    <h3 className="font-semibold">{cat.name}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {cat._count?.assets || 0} tài sản
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                        {categories.length === 0 && (
                            <div className="col-span-full text-center py-8 text-muted-foreground">
                                Chưa có danh mục nào
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
            </div>
        </div>
    );
}
