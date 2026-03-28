'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/ui/page-header';
import {
  Monitor, Search, Plus, Package, Shield, Wrench, AlertTriangle, MoreHorizontal,
  Trash2, UserCheck, RotateCcw, Server, Laptop, Printer, Wifi, Camera, HardDrive,
  Network, ChevronRight, QrCode, FileDown, X, Settings2, Eye, Edit, UserMinus,
  ArrowUpDown, SlidersHorizontal, Calendar, MapPin, Building2, Tag, Cpu, MemoryStick,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useHardwareAssets, useHardwareAsset, useAssetCategories, useAssetStatistics,
  useCreateAsset, useUpdateAsset, useDeleteAsset, useAssignAsset, useReturnAsset,
  type ITAsset, type AssetFilters,
} from '@/services/hardware.service';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// === ASSET TYPE CONFIG ===
const ASSET_TYPES = [
  { value: 'ALL', label: 'Tất cả', icon: Package, color: 'text-slate-500' },
  { value: 'SERVER', label: 'Server', icon: Server, color: 'text-emerald-500' },
  { value: 'LAPTOP', label: 'Laptop', icon: Laptop, color: 'text-sky-500' },
  { value: 'DESKTOP', label: 'Desktop', icon: Monitor, color: 'text-blue-500' },
  { value: 'MONITOR', label: 'Monitor', icon: Monitor, color: 'text-cyan-500' },
  { value: 'PRINTER', label: 'Printer', icon: Printer, color: 'text-amber-500' },
  { value: 'ROUTER', label: 'Router', icon: Network, color: 'text-rose-500' },
  { value: 'SWITCH', label: 'Switch', icon: Network, color: 'text-orange-500' },
  { value: 'ACCESS_POINT', label: 'Access Point', icon: Wifi, color: 'text-teal-500' },
  { value: 'CAMERA', label: 'Camera', icon: Camera, color: 'text-red-500' },
  { value: 'DVR_NVR', label: 'DVR/NVR', icon: HardDrive, color: 'text-pink-500' },
  { value: 'OTHER', label: 'Khác', icon: Package, color: 'text-gray-500' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: 'Sẵn sàng', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  IN_USE: { label: 'Đang dùng', color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800' },
  MAINTENANCE: { label: 'Bảo trì', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  RETIRED: { label: 'Thanh lý', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700' },
  LOST: { label: 'Mất', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' },
};

const CONDITION_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  NEW: { label: 'Mới', emoji: '✨', color: 'text-emerald-600' },
  GOOD: { label: 'Tốt', emoji: '👍', color: 'text-sky-600' },
  FAIR: { label: 'Trung bình', emoji: '👌', color: 'text-amber-600' },
  POOR: { label: 'Kém', emoji: '⚠️', color: 'text-orange-600' },
  BROKEN: { label: 'Hỏng', emoji: '❌', color: 'text-rose-600' },
};

export default function HardwareInventoryPage() {
  // State
  const [filters, setFilters] = useState<AssetFilters>({ page: 1, limit: 50 });
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<ITAsset | null>(null);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeout = useCallback((value: string) => {
    setSearch(value);
    const timer = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timer);
  }, []);

  // Computed filters
  const activeFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch || undefined,
    assetType: activeType !== 'ALL' ? activeType : undefined,
  }), [filters, debouncedSearch, activeType]);

  // Data
  const { data: assetsData, isLoading } = useHardwareAssets(activeFilters);
  const { data: stats } = useAssetStatistics();
  const { data: categories = [] } = useAssetCategories();
  const { data: assetDetail, isLoading: isLoadingDetail } = useHardwareAsset(selectedId);
  const { data: employeesData } = useQuery({
    queryKey: ['employees-mini'],
    queryFn: () => apiClient.get('/employees', { params: { limit: 1000 } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const { data: departmentsData } = useQuery({
    queryKey: ['departments-mini'],
    queryFn: () => apiClient.get('/organization/departments').then(r => r.data).catch(() => []),
    staleTime: 5 * 60 * 1000,
  });

  const assets = assetsData?.data || [];
  const meta = assetsData?.meta;
  const employees = employeesData?.data || [];
  const departments = Array.isArray(departmentsData) ? departmentsData : (departmentsData?.data || []);

  // Mutations
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();
  const assignMutation = useAssignAsset();
  const returnMutation = useReturnAsset();

  // Handlers
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa thiết bị này?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Đã xóa thiết bị');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi xóa');
    }
  };

  const handleReturn = async (id: string) => {
    if (!confirm('Thu hồi thiết bị này?')) return;
    try {
      await returnMutation.mutateAsync({ id, data: { condition: 'GOOD' } });
      toast.success('Đã thu hồi thiết bị');
      setSelectedId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi thu hồi');
    }
  };

  // Stats summary
  const statCards = [
    { label: 'Tổng thiết bị', value: stats?.total || 0, icon: Package, gradient: 'from-sky-500 to-cyan-500' },
    { label: 'Đang sử dụng', value: stats?.byStatus?.find((s: any) => s.status === 'IN_USE')?.count || 0, icon: UserCheck, gradient: 'from-emerald-500 to-teal-500' },
    { label: 'Sẵn sàng', value: stats?.byStatus?.find((s: any) => s.status === 'AVAILABLE')?.count || 0, icon: Shield, gradient: 'from-blue-500 to-sky-500' },
    { label: 'Bảo trì', value: stats?.byStatus?.find((s: any) => s.status === 'MAINTENANCE')?.count || 0, icon: Wrench, gradient: 'from-amber-500 to-orange-500' },
  ];

  const getWarrantyDaysLeft = (date: string | undefined) => {
    if (!date) return null;
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-0rem)] space-y-3 p-2 bg-background">
      {/* Header */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <PageHeader
          title="QUẢN LÝ THIẾT BỊ"
          titleClassName="from-sky-600 to-cyan-600 dark:from-sky-400 dark:to-cyan-400"
          icon={
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-sky-500 to-cyan-600">
              <Monitor className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
            </div>
          }
          className="mb-0 border-none bg-transparent p-0 shadow-none"
        >
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-9 bg-gradient-to-r from-sky-600 to-cyan-600 text-white hover:from-sky-700 hover:to-cyan-700 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Thêm thiết bị
          </Button>
        </PageHeader>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 custom-scrollbar pr-1 pb-2">
        {/* Stats Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="overflow-hidden border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient} text-white shadow-sm`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground tracking-wide">{stat.label}</p>
                    <p className="text-xl font-bold tracking-tight">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Asset Type Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {ASSET_TYPES.map((type) => {
            const TypeIcon = type.icon;
            const isActive = activeType === type.value;
            const count = type.value === 'ALL'
              ? (stats?.total || 0)
              : (stats?.byAssetType?.find((t: any) => t.assetType === type.value)?.count || 0);

            return (
              <button
                key={type.value}
                onClick={() => setActiveType(type.value)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200
                  ${isActive
                    ? 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 ring-1 ring-sky-300 dark:ring-sky-700 shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <TypeIcon className={`h-3.5 w-3.5 ${isActive ? type.color : ''}`} />
                {type.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-sky-200 dark:bg-sky-900' : 'bg-muted-foreground/10'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo mã, tên, S/N, IP..."
              value={search}
              onChange={(e) => searchTimeout(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <Select
            value={filters.status || 'all'}
            onValueChange={(v) => setFilters(f => ({ ...f, status: v === 'all' ? undefined : v }))}
          >
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.condition || 'all'}
            onValueChange={(v) => setFilters(f => ({ ...f, condition: v === 'all' ? undefined : v }))}
          >
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Tình trạng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả tình trạng</SelectItem>
              {Object.entries(CONDITION_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.emoji} {cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.departmentId || 'all'}
            onValueChange={(v) => setFilters(f => ({ ...f, departmentId: v === 'all' ? undefined : v }))}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Phòng ban" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filters.status || filters.condition || filters.departmentId || debouncedSearch) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs"
              onClick={() => {
                setFilters({ page: 1, limit: 50 });
                setSearch('');
                setDebouncedSearch('');
                setActiveType('ALL');
              }}
            >
              <X className="h-3 w-3 mr-1" /> Xóa lọc
            </Button>
          )}

          <div className="ml-auto text-xs text-muted-foreground">
            {meta && `${meta.total} thiết bị`}
          </div>
        </div>

        {/* Data Table */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[100px]">Mã</TableHead>
                  <TableHead>Thiết bị</TableHead>
                  <TableHead className="w-[100px]">Loại</TableHead>
                  <TableHead className="w-[100px]">Trạng thái</TableHead>
                  <TableHead className="w-[100px]">Tình trạng</TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Phòng ban</TableHead>
                  <TableHead className="w-[90px]">Bảo hành</TableHead>
                  <TableHead className="text-right w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset: ITAsset) => {
                  const statusCfg = STATUS_CONFIG[asset.status] || { label: asset.status, color: '', bg: '' };
                  const condCfg = CONDITION_CONFIG[asset.condition] || { label: asset.condition, emoji: '', color: '' };
                  const typeInfo = ASSET_TYPES.find(t => t.value === asset.assetType) || ASSET_TYPES[ASSET_TYPES.length - 1];
                  const TypeIcon = typeInfo.icon;
                  const warrantyDays = getWarrantyDaysLeft(asset.warrantyEndDate);

                  return (
                    <TableRow
                      key={asset.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={() => setSelectedId(asset.id)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">{asset.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${typeInfo.color} bg-muted/50`}>
                            <TypeIcon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="font-medium text-sm leading-tight">{asset.name}</div>
                            {(asset.brand || asset.model) && (
                              <div className="text-xs text-muted-foreground">
                                {[asset.brand, asset.model].filter(Boolean).join(' ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs ${typeInfo.color}`}>{typeInfo.label}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs ${condCfg.color}`}>
                          {condCfg.emoji} {condCfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{asset.assignedTo?.fullName || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{asset.department?.name || '—'}</TableCell>
                      <TableCell>
                        {warrantyDays !== null ? (
                          <span className={`text-xs font-medium ${warrantyDays <= 30 ? 'text-rose-600' : warrantyDays <= 90 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {warrantyDays > 0 ? `${warrantyDays}d` : 'Hết hạn'}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedId(asset.id); }}>
                              <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditAsset(asset); setCreateOpen(true); }}>
                              <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
                            </DropdownMenuItem>
                            {asset.status === 'AVAILABLE' && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setAssignOpen(asset.id); }}>
                                <UserCheck className="mr-2 h-4 w-4" /> Gán cho nhân viên
                              </DropdownMenuItem>
                            )}
                            {asset.status === 'IN_USE' && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReturn(asset.id); }}>
                                <UserMinus className="mr-2 h-4 w-4" /> Thu hồi
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => handleDelete(e as unknown as React.MouseEvent, asset.id)}
                              className="text-rose-600 focus:text-rose-600"
                            >
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
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">{isLoading ? 'Đang tải...' : 'Chưa có thiết bị nào'}</p>
                      {!isLoading && (
                        <Button variant="link" size="sm" onClick={() => setCreateOpen(true)} className="mt-1">
                          <Plus className="h-3 w-3 mr-1" /> Thêm thiết bị đầu tiên
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Trang {meta.page}/{meta.totalPages} ({meta.total} thiết bị)
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ========================= */}
      {/* DETAIL DRAWER */}
      {/* ========================= */}
      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {isLoadingDetail ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Đang tải...</div>
          ) : assetDetail && (
            <div className="space-y-5">
              <SheetHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono text-xs">{assetDetail.code}</Badge>
                  {(() => {
                    const s = STATUS_CONFIG[assetDetail.status];
                    return s ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${s.bg} ${s.color}`}>{s.label}</span> : null;
                  })()}
                  {(() => {
                    const c = CONDITION_CONFIG[assetDetail.condition];
                    return c ? <span className={`text-xs ${c.color}`}>{c.emoji} {c.label}</span> : null;
                  })()}
                </div>
                <SheetTitle className="text-lg">{assetDetail.name}</SheetTitle>
                <SheetDescription>
                  {[assetDetail.brand, assetDetail.model].filter(Boolean).join(' · ')}
                  {assetDetail.serialNumber && ` · S/N: ${assetDetail.serialNumber}`}
                </SheetDescription>
              </SheetHeader>

              {/* Core Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {assetDetail.assetType && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3"/> Loại thiết bị</p>
                    <p className="font-medium">{ASSET_TYPES.find(t => t.value === assetDetail.assetType)?.label || assetDetail.assetType}</p>
                  </div>
                )}
                {assetDetail.category && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3"/> Danh mục</p>
                    <p className="font-medium">{assetDetail.category.name}</p>
                  </div>
                )}
                {assetDetail.department && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3"/> Phòng ban</p>
                    <p className="font-medium">{assetDetail.department.name}</p>
                  </div>
                )}
                {assetDetail.assignedTo && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><UserCheck className="h-3 w-3"/> Người dùng</p>
                    <p className="font-medium">{assetDetail.assignedTo.fullName}</p>
                  </div>
                )}
                {assetDetail.location && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/> Vị trí</p>
                    <p className="font-medium">{assetDetail.location}</p>
                  </div>
                )}
                {assetDetail.warrantyEndDate && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3"/> Bảo hành đến</p>
                    <p className="font-medium">
                      {new Date(assetDetail.warrantyEndDate).toLocaleDateString('vi-VN')}
                      {(() => {
                        const days = getWarrantyDaysLeft(assetDetail.warrantyEndDate);
                        if (days === null) return null;
                        return (
                          <span className={`ml-1 text-xs ${days <= 30 ? 'text-rose-600' : days <= 90 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            ({days > 0 ? `còn ${days} ngày` : 'đã hết hạn'})
                          </span>
                        );
                      })()}
                    </p>
                  </div>
                )}
              </div>

              {/* Network Info */}
              {(assetDetail.ipAddress || assetDetail.macAddress || assetDetail.hostname) && (
                <div className="p-3 bg-muted/40 rounded-lg space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Network className="h-3.5 w-3.5"/> Thông tin mạng
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {assetDetail.hostname && <div><span className="text-xs text-muted-foreground">Hostname:</span> <span className="font-mono text-xs">{assetDetail.hostname}</span></div>}
                    {assetDetail.ipAddress && <div><span className="text-xs text-muted-foreground">IP:</span> <span className="font-mono text-xs">{assetDetail.ipAddress}</span></div>}
                    {assetDetail.macAddress && <div><span className="text-xs text-muted-foreground">MAC:</span> <span className="font-mono text-xs">{assetDetail.macAddress}</span></div>}
                  </div>
                </div>
              )}

              {/* Purchase Info */}
              {(assetDetail.purchaseDate || assetDetail.purchasePrice) && (
                <div className="p-3 bg-muted/40 rounded-lg space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thông tin mua</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {assetDetail.purchaseDate && (
                      <div>
                        <span className="text-xs text-muted-foreground">Ngày mua:</span>{' '}
                        {new Date(assetDetail.purchaseDate).toLocaleDateString('vi-VN')}
                      </div>
                    )}
                    {assetDetail.purchasePrice && (
                      <div>
                        <span className="text-xs text-muted-foreground">Giá:</span>{' '}
                        <span className="font-semibold">{assetDetail.purchasePrice.toLocaleString('vi-VN')} ₫</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Software Installed */}
              {assetDetail.softwareInstalls?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5"/> Phần mềm đã cài ({assetDetail.softwareInstalls.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {assetDetail.softwareInstalls.map((si: any) => (
                      <span
                        key={si.id}
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${si.isAuthorized
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                          : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {si.isAuthorized ? '✅' : '⚠️'} {si.software?.name} {si.version || si.software?.version || ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignment History */}
              {assetDetail.assignments?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5"/> Lịch sử gán ({assetDetail.assignments.length})
                  </h4>
                  <div className="space-y-1.5">
                    {assetDetail.assignments.slice(0, 5).map((a: any) => (
                      <div key={a.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/30">
                        <span className="font-medium">{a.employee?.fullName}</span>
                        <span className="text-muted-foreground">
                          {new Date(a.assignedDate).toLocaleDateString('vi-VN')}
                          {a.returnedDate && ` → ${new Date(a.returnedDate).toLocaleDateString('vi-VN')}`}
                        </span>
                        {!a.returnedDate && <Badge variant="outline" className="text-[10px] h-4">Hiện tại</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Maintenance History */}
              {assetDetail.maintenances?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5"/> Lịch sử bảo trì ({assetDetail.maintenances.length})
                  </h4>
                  <div className="space-y-1.5">
                    {assetDetail.maintenances.slice(0, 5).map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
                        <div>
                          <span className="font-medium capitalize">{m.type?.toLowerCase()}</span>
                          {m.description && <span className="text-muted-foreground ml-2">{m.description}</span>}
                        </div>
                        <span className="text-muted-foreground">
                          {new Date(m.scheduledDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {assetDetail.note && (
                <div className="p-3 bg-muted/40 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1 font-semibold">Ghi chú</p>
                  <p className="text-sm whitespace-pre-wrap">{assetDetail.note}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => { setEditAsset(assetDetail); setSelectedId(null); setCreateOpen(true); }}>
                  <Edit className="h-3.5 w-3.5 mr-1.5" /> Chỉnh sửa
                </Button>
                {assetDetail.status === 'AVAILABLE' && (
                  <Button variant="outline" size="sm" onClick={() => { setSelectedId(null); setAssignOpen(assetDetail.id); }}>
                    <UserCheck className="h-3.5 w-3.5 mr-1.5" /> Gán
                  </Button>
                )}
                {assetDetail.status === 'IN_USE' && (
                  <Button variant="outline" size="sm" onClick={() => handleReturn(assetDetail.id)}>
                    <UserMinus className="h-3.5 w-3.5 mr-1.5" /> Thu hồi
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ========================= */}
      {/* CREATE / EDIT DIALOG */}
      {/* ========================= */}
      <AssetFormDialog
        open={createOpen}
        onOpenChange={(open) => { setCreateOpen(open); if (!open) setEditAsset(null); }}
        asset={editAsset}
        categories={categories}
        departments={departments}
        onSubmit={async (data) => {
          try {
            if (editAsset) {
              await updateMutation.mutateAsync({ id: editAsset.id, data });
              toast.success('Đã cập nhật thiết bị');
            } else {
              await createMutation.mutateAsync(data);
              toast.success('Đã thêm thiết bị mới');
            }
            setCreateOpen(false);
            setEditAsset(null);
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lỗi khi lưu');
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* ========================= */}
      {/* ASSIGN DIALOG */}
      {/* ========================= */}
      <AssignDialog
        open={!!assignOpen}
        onOpenChange={(open) => !open && setAssignOpen(null)}
        employees={employees}
        onSubmit={async (employeeId, note) => {
          if (!assignOpen) return;
          try {
            await assignMutation.mutateAsync({ id: assignOpen, data: { employeeId, note } });
            toast.success('Đã gán thiết bị');
            setAssignOpen(null);
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lỗi khi gán');
          }
        }}
        isLoading={assignMutation.isPending}
      />
    </div>
  );
}

// ========================= //
// ASSET FORM DIALOG         //
// ========================= //
function AssetFormDialog({
  open, onOpenChange, asset, categories, departments, onSubmit, isLoading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  asset: ITAsset | null;
  categories: any[];
  departments: any[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState<any>({});

  // Reset form when asset changes
  const initForm = useCallback(() => {
    if (asset) {
      setForm({
        name: asset.name,
        categoryId: asset.categoryId,
        assetType: asset.assetType || '',
        brand: asset.brand || '',
        model: asset.model || '',
        serialNumber: asset.serialNumber || '',
        purchaseDate: asset.purchaseDate?.split('T')[0] || '',
        purchasePrice: asset.purchasePrice || '',
        warrantyEndDate: asset.warrantyEndDate?.split('T')[0] || '',
        location: asset.location || '',
        ipAddress: asset.ipAddress || '',
        macAddress: asset.macAddress || '',
        hostname: asset.hostname || '',
        departmentId: asset.departmentId || '',
        note: asset.note || '',
        status: asset.status || 'AVAILABLE',
        condition: asset.condition || 'GOOD',
      });
    } else {
      setForm({
        name: '', categoryId: '', assetType: '', brand: '', model: '',
        serialNumber: '', purchaseDate: '', purchasePrice: '', warrantyEndDate: '',
        location: '', ipAddress: '', macAddress: '', hostname: '',
        departmentId: '', note: '', status: 'AVAILABLE', condition: 'GOOD',
      });
    }
  }, [asset]);

  // Reset on open
  useMemo(() => { if (open) initForm(); }, [open, initForm]);

  const handleSubmit = () => {
    if (!form.name || !form.categoryId) {
      toast.error('Vui lòng nhập tên và chọn danh mục');
      return;
    }
    const data: any = { ...form };
    if (data.purchasePrice) data.purchasePrice = parseInt(data.purchasePrice);
    else delete data.purchasePrice;
    if (!data.purchaseDate) delete data.purchaseDate;
    if (!data.warrantyEndDate) delete data.warrantyEndDate;
    if (!data.departmentId) delete data.departmentId;
    if (!data.assetType) delete data.assetType;
    Object.keys(data).forEach(k => { if (data[k] === '') delete data[k]; });
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Row 1: Name + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tên thiết bị *</Label>
              <Input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="VD: Dell Latitude 5530" />
            </div>
            <div>
              <Label>Loại thiết bị</Label>
              <Select value={form.assetType || ''} onValueChange={v => setForm((f: any) => ({ ...f, assetType: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.filter(t => t.value !== 'ALL').map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Category + Department */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Danh mục *</Label>
              <Select value={form.categoryId || ''} onValueChange={v => setForm((f: any) => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.icon || '📦'} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phòng ban</Label>
              <Select value={form.departmentId || ''} onValueChange={v => setForm((f: any) => ({ ...f, departmentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Brand + Model + Serial */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Hãng</Label>
              <Input value={form.brand || ''} onChange={e => setForm((f: any) => ({ ...f, brand: e.target.value }))} placeholder="Dell, HP, Cisco..." />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={form.model || ''} onChange={e => setForm((f: any) => ({ ...f, model: e.target.value }))} placeholder="Latitude 5530" />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input value={form.serialNumber || ''} onChange={e => setForm((f: any) => ({ ...f, serialNumber: e.target.value }))} placeholder="S/N" />
            </div>
          </div>

          {/* Row 4: Network */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Hostname</Label>
              <Input value={form.hostname || ''} onChange={e => setForm((f: any) => ({ ...f, hostname: e.target.value }))} placeholder="PC-001" />
            </div>
            <div>
              <Label>IP Address</Label>
              <Input value={form.ipAddress || ''} onChange={e => setForm((f: any) => ({ ...f, ipAddress: e.target.value }))} placeholder="192.168.1.100" />
            </div>
            <div>
              <Label>MAC Address</Label>
              <Input value={form.macAddress || ''} onChange={e => setForm((f: any) => ({ ...f, macAddress: e.target.value }))} placeholder="AA:BB:CC:DD:EE:FF" />
            </div>
          </div>

          {/* Row 5: Purchase + Warranty */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Ngày mua</Label>
              <Input type="date" value={form.purchaseDate || ''} onChange={e => setForm((f: any) => ({ ...f, purchaseDate: e.target.value }))} />
            </div>
            <div>
              <Label>Giá mua (VNĐ)</Label>
              <Input type="number" value={form.purchasePrice || ''} onChange={e => setForm((f: any) => ({ ...f, purchasePrice: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label>Bảo hành đến</Label>
              <Input type="date" value={form.warrantyEndDate || ''} onChange={e => setForm((f: any) => ({ ...f, warrantyEndDate: e.target.value }))} />
            </div>
          </div>

          {/* Row 6: Location + Status + Condition */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Vị trí</Label>
              <Input value={form.location || ''} onChange={e => setForm((f: any) => ({ ...f, location: e.target.value }))} placeholder="Tầng 2 - Phòng IT" />
            </div>
            {asset && (
              <>
                <div>
                  <Label>Trạng thái</Label>
                  <Select value={form.status || 'AVAILABLE'} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tình trạng</Label>
                  <Select value={form.condition || 'GOOD'} onValueChange={v => setForm((f: any) => ({ ...f, condition: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONDITION_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Note */}
          <div>
            <Label>Ghi chú</Label>
            <Textarea value={form.note || ''} onChange={e => setForm((f: any) => ({ ...f, note: e.target.value }))} rows={2} placeholder="Ghi chú thêm..." />
          </div>

          <Button onClick={handleSubmit} disabled={isLoading} className="w-full bg-gradient-to-r from-sky-600 to-cyan-600 text-white hover:from-sky-700 hover:to-cyan-700">
            {isLoading ? 'Đang lưu...' : (asset ? 'Cập nhật' : 'Thêm thiết bị')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========================= //
// ASSIGN DIALOG             //
// ========================= //
function AssignDialog({
  open, onOpenChange, employees, onSubmit, isLoading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: any[];
  onSubmit: (employeeId: string, note?: string) => void;
  isLoading: boolean;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [note, setNote] = useState('');
  const [searchEmp, setSearchEmp] = useState('');

  const filteredEmployees = useMemo(() => {
    if (!searchEmp) return employees.slice(0, 20);
    return employees.filter((e: any) =>
      e.fullName?.toLowerCase().includes(searchEmp.toLowerCase()) ||
      e.employeeCode?.toLowerCase().includes(searchEmp.toLowerCase())
    ).slice(0, 20);
  }, [employees, searchEmp]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gán thiết bị cho nhân viên</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nhân viên *</Label>
            <Input
              placeholder="Tìm nhân viên..."
              value={searchEmp}
              onChange={e => setSearchEmp(e.target.value)}
              className="mb-2"
            />
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Chọn nhân viên" /></SelectTrigger>
              <SelectContent>
                {filteredEmployees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.employeeCode} - {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ghi chú</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Ghi chú khi bàn giao..." />
          </div>
          <Button
            onClick={() => { if (employeeId) onSubmit(employeeId, note); else toast.error('Chọn nhân viên'); }}
            disabled={isLoading || !employeeId}
            className="w-full"
          >
            {isLoading ? 'Đang xử lý...' : 'Gán thiết bị'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
