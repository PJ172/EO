'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/ui/page-header';
import {
  Search, Plus, MoreHorizontal, Trash2, Eye, Edit, X, Package,
  KeyRound, ShieldCheck, ShieldAlert, Clock, DollarSign,
  Download, Server, Laptop, Monitor, HardDrive, AlertTriangle,
  CheckCircle2, XCircle, PlugZap, Unplug,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useSoftwareList, useSoftwareDetail, useSoftwareStats, useSoftwareCompliance,
  useCreateSoftware, useUpdateSoftware, useDeleteSoftware,
  useInstallSoftware, useUninstallSoftware, useToggleAuthorized,
  type Software, type SoftwareFilters, type SoftwareInstallation,
} from '@/services/software.service';
import { useHardwareAssets } from '@/services/hardware.service';

// === CONFIG ===
const LICENSE_TYPES: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  PAID: { label: 'Bản quyền', icon: KeyRound, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  FREE: { label: 'Miễn phí', icon: Package, color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800' },
  TRIAL: { label: 'Dùng thử', icon: Clock, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  OEM: { label: 'OEM', icon: HardDrive, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
  SUBSCRIPTION: { label: 'Subscription', icon: DollarSign, color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Đang dùng', color: 'text-emerald-600' },
  INACTIVE: { label: 'Ngừng dùng', color: 'text-slate-500' },
  EXPIRED: { label: 'Hết hạn', color: 'text-rose-600' },
};

export default function SoftwareRegistryPage() {
  const [filters, setFilters] = useState<SoftwareFilters>({ page: 1, limit: 50 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editSoftware, setEditSoftware] = useState<Software | null>(null);
  const [installOpen, setInstallOpen] = useState<string | null>(null);

  const searchTimeout = useCallback((value: string) => {
    setSearch(value);
    const timer = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timer);
  }, []);

  const activeFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch || undefined,
  }), [filters, debouncedSearch]);

  // Data
  const { data: listData, isLoading } = useSoftwareList(activeFilters);
  const { data: stats } = useSoftwareStats();
  const { data: compliance } = useSoftwareCompliance();
  const { data: detail, isLoading: isLoadingDetail } = useSoftwareDetail(selectedId);

  const softwareList = listData?.data || [];
  const meta = listData?.meta;

  // Mutations
  const createMut = useCreateSoftware();
  const updateMut = useUpdateSoftware();
  const deleteMut = useDeleteSoftware();
  const uninstallMut = useUninstallSoftware();
  const toggleAuthMut = useToggleAuthorized();

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Xóa phần mềm này?')) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Đã xóa phần mềm');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi xóa');
    }
  };

  const handleUninstall = async (installationId: string) => {
    if (!confirm('Gỡ cài đặt phần mềm này khỏi thiết bị?')) return;
    try {
      await uninstallMut.mutateAsync({ installationId });
      toast.success('Đã gỡ cài đặt');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi gỡ');
    }
  };

  const handleToggleAuth = async (installationId: string) => {
    try {
      await toggleAuthMut.mutateAsync(installationId);
      toast.success('Đã cập nhật trạng thái');
    } catch (err: any) {
      toast.error('Lỗi');
    }
  };

  const getExpiryDays = (date: string | undefined) => {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  // Stats cards
  const statCards = [
    { label: 'Tổng phần mềm', value: stats?.totalSoftware || 0, icon: Package, gradient: 'from-blue-500 to-cyan-500' },
    { label: 'Đã cài đặt', value: stats?.totalInstallations || 0, icon: Download, gradient: 'from-emerald-500 to-teal-500' },
    { label: 'Không phép', value: stats?.unauthorizedCount || 0, icon: ShieldAlert, gradient: 'from-rose-500 to-red-500' },
    {
      label: 'Cảnh báo License',
      value: (compliance?.overLicensed?.length || 0) + (compliance?.nearLimit?.length || 0) + (compliance?.expired?.length || 0),
      icon: AlertTriangle,
      gradient: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-0rem)] space-y-3 p-2 bg-background">
      {/* Header */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <PageHeader
          title="QUẢN LÝ PHẦN MỀM"
          titleClassName="from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400"
          icon={
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-teal-500 to-emerald-600">
              <HardDrive className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
            </div>
          }
          className="mb-0 border-none bg-transparent p-0 shadow-none"
        >
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-9 bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Thêm phần mềm
          </Button>
        </PageHeader>
      </div>

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

        {/* Compliance Alerts */}
        {compliance && (compliance.overLicensed?.length > 0 || compliance.expired?.length > 0) && (
          <div className="flex items-center gap-2 p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <div className="flex gap-3 flex-wrap text-rose-700 dark:text-rose-400">
              {compliance.overLicensed?.length > 0 && (
                <span>⚠️ {compliance.overLicensed.length} phần mềm vượt giới hạn license</span>
              )}
              {compliance.expired?.length > 0 && (
                <span>🔴 {compliance.expired.length} phần mềm hết hạn</span>
              )}
              {compliance.nearLimit?.length > 0 && (
                <span>🟡 {compliance.nearLimit.length} phần mềm gần hết license</span>
              )}
            </div>
          </div>
        )}

        {/* Filters Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm phần mềm, vendor, license key..."
              value={search}
              onChange={(e) => searchTimeout(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <Select value={filters.licenseType || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, licenseType: v === 'all' ? undefined : v }))}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Loại license" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {Object.entries(LICENSE_TYPES).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.status || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, status: v === 'all' ? undefined : v }))}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filters.licenseType || filters.status || debouncedSearch) && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setFilters({ page: 1, limit: 50 }); setSearch(''); setDebouncedSearch(''); }}>
              <X className="h-3 w-3 mr-1" /> Xóa lọc
            </Button>
          )}

          <div className="ml-auto text-xs text-muted-foreground">
            {meta && `${meta.total} phần mềm`}
          </div>
        </div>

        {/* Data Table */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Phần mềm</TableHead>
                  <TableHead className="w-[110px]">Loại license</TableHead>
                  <TableHead className="w-[90px]">Trạng thái</TableHead>
                  <TableHead className="w-[110px] text-center">Cài đặt</TableHead>
                  <TableHead className="w-[100px]">Hết hạn</TableHead>
                  <TableHead className="w-[100px] text-right">Chi phí</TableHead>
                  <TableHead className="text-right w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {softwareList.map((sw: Software) => {
                  const licCfg = LICENSE_TYPES[sw.licenseType] || LICENSE_TYPES.FREE;
                  const LicIcon = licCfg.icon;
                  const statusCfg = STATUS_CONFIG[sw.status] || { label: sw.status, color: '' };
                  const expiryDays = getExpiryDays(sw.expiryDate);
                  const isOverLimit = sw.maxInstalls && (sw.activeInstalls || 0) > sw.maxInstalls;

                  return (
                    <TableRow
                      key={sw.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={() => setSelectedId(sw.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${licCfg.color} bg-muted/50`}>
                            <LicIcon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="font-medium text-sm leading-tight">{sw.name}</div>
                            {(sw.vendor || sw.version) && (
                              <div className="text-xs text-muted-foreground">
                                {[sw.vendor, sw.version && `v${sw.version}`].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${licCfg.bg} ${licCfg.color}`}>
                          {licCfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`text-sm font-semibold ${isOverLimit ? 'text-rose-600' : ''}`}>
                            {sw.activeInstalls || 0}
                          </span>
                          {sw.maxInstalls && (
                            <span className="text-xs text-muted-foreground">/ {sw.maxInstalls}</span>
                          )}
                          {isOverLimit && <AlertTriangle className="h-3 w-3 text-rose-500" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        {expiryDays !== null ? (
                          <span className={`text-xs font-medium ${expiryDays <= 0 ? 'text-rose-600' : expiryDays <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {expiryDays > 0 ? `${expiryDays}d` : 'Hết hạn'}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {sw.cost ? (
                          <span className="text-sm font-medium">{sw.cost.toLocaleString('vi-VN')} ₫</span>
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
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedId(sw.id); }}>
                              <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditSoftware(sw); setCreateOpen(true); }}>
                              <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setInstallOpen(sw.id); }}>
                              <PlugZap className="mr-2 h-4 w-4" /> Cài lên thiết bị
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => handleDelete(e as unknown as React.MouseEvent, sw.id)}
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
                {softwareList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <HardDrive className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">{isLoading ? 'Đang tải...' : 'Chưa có phần mềm nào'}</p>
                      {!isLoading && (
                        <Button variant="link" size="sm" onClick={() => setCreateOpen(true)} className="mt-1">
                          <Plus className="h-3 w-3 mr-1" /> Thêm phần mềm đầu tiên
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
            <span className="text-muted-foreground">Trang {meta.page}/{meta.totalPages} ({meta.total})</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}>Trước</Button>
              <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}>Sau</Button>
            </div>
          </div>
        )}
      </div>

      {/* ========================= */}
      {/* DETAIL DRAWER             */}
      {/* ========================= */}
      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {isLoadingDetail ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Đang tải...</div>
          ) : detail && (
            <div className="space-y-5">
              <SheetHeader>
                <div className="flex items-center gap-2 mb-1">
                  {(() => {
                    const l = LICENSE_TYPES[detail.licenseType];
                    return l ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${l.bg} ${l.color}`}>{l.label}</span> : null;
                  })()}
                  <span className={`text-xs font-medium ${STATUS_CONFIG[detail.status]?.color || ''}`}>
                    {STATUS_CONFIG[detail.status]?.label || detail.status}
                  </span>
                </div>
                <SheetTitle className="text-lg">{detail.name}</SheetTitle>
                <SheetDescription>
                  {[detail.vendor, detail.version && `v${detail.version}`].filter(Boolean).join(' · ')}
                </SheetDescription>
              </SheetHeader>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {detail.licenseKey && (
                  <div className="space-y-0.5 col-span-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><KeyRound className="h-3 w-3"/> License Key</p>
                    <p className="font-mono text-xs bg-muted/50 p-1.5 rounded break-all">{detail.licenseKey}</p>
                  </div>
                )}
                {detail.maxInstalls && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Giới hạn cài</p>
                    <p className="font-semibold">
                      <span className={detail.activeInstalls > detail.maxInstalls ? 'text-rose-600' : ''}>
                        {detail.activeInstalls}
                      </span> / {detail.maxInstalls} máy
                    </p>
                  </div>
                )}
                {detail.cost && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3"/> Chi phí</p>
                    <p className="font-semibold">{detail.cost.toLocaleString('vi-VN')} ₫</p>
                  </div>
                )}
                {detail.purchaseDate && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Ngày mua</p>
                    <p>{new Date(detail.purchaseDate).toLocaleDateString('vi-VN')}</p>
                  </div>
                )}
                {detail.expiryDate && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Hết hạn</p>
                    <p>
                      {new Date(detail.expiryDate).toLocaleDateString('vi-VN')}
                      {(() => {
                        const days = getExpiryDays(detail.expiryDate);
                        if (days === null) return null;
                        return (
                          <span className={`ml-1 text-xs ${days <= 0 ? 'text-rose-600' : days <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            ({days > 0 ? `còn ${days} ngày` : 'đã hết hạn'})
                          </span>
                        );
                      })()}
                    </p>
                  </div>
                )}
              </div>

              {/* Installations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Download className="h-3.5 w-3.5"/> Thiết bị đã cài ({detail.installations?.filter((i: SoftwareInstallation) => !i.removedDate)?.length || 0})
                  </h4>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSelectedId(null); setInstallOpen(detail.id); }}>
                    <PlugZap className="h-3 w-3 mr-1" /> Cài thêm
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {detail.installations?.filter((i: SoftwareInstallation) => !i.removedDate)?.map((inst: SoftwareInstallation) => (
                    <div key={inst.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={inst.isAuthorized ? 'text-emerald-500' : 'text-rose-500'}>
                          {inst.isAuthorized ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        </span>
                        <div>
                          <div className="font-medium">{inst.asset?.name || inst.asset?.code}</div>
                          <div className="text-muted-foreground">
                            {[inst.asset?.hostname, inst.asset?.assignedTo?.fullName, inst.asset?.department?.name].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleAuth(inst.id)}
                          title={inst.isAuthorized ? 'Đánh dấu không phép' : 'Phê duyệt'}
                        >
                          {inst.isAuthorized ? <ShieldCheck className="h-3 w-3 text-emerald-500" /> : <ShieldAlert className="h-3 w-3 text-rose-500" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500" onClick={() => handleUninstall(inst.id)} title="Gỡ cài đặt">
                          <Unplug className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!detail.installations || detail.installations.filter((i: SoftwareInstallation) => !i.removedDate).length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-3">Chưa cài trên thiết bị nào</p>
                  )}
                </div>

                {/* Removed installations */}
                {detail.installations?.filter((i: SoftwareInstallation) => i.removedDate)?.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Đã gỡ ({detail.installations.filter((i: SoftwareInstallation) => i.removedDate).length})
                    </summary>
                    <div className="mt-1 space-y-1">
                      {detail.installations.filter((i: SoftwareInstallation) => i.removedDate).map((inst: SoftwareInstallation) => (
                        <div key={inst.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/20 text-xs text-muted-foreground line-through">
                          {inst.asset?.name || inst.asset?.code}
                          <span>— gỡ {new Date(inst.removedDate!).toLocaleDateString('vi-VN')}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>

              {detail.note && (
                <div className="p-3 bg-muted/40 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1 font-semibold">Ghi chú</p>
                  <p className="text-sm whitespace-pre-wrap">{detail.note}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => { setEditSoftware(detail); setSelectedId(null); setCreateOpen(true); }}>
                  <Edit className="h-3.5 w-3.5 mr-1.5" /> Chỉnh sửa
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectedId(null); setInstallOpen(detail.id); }}>
                  <PlugZap className="h-3.5 w-3.5 mr-1.5" /> Cài lên thiết bị
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ========================= */}
      {/* CREATE / EDIT DIALOG      */}
      {/* ========================= */}
      <SoftwareFormDialog
        open={createOpen}
        onOpenChange={(open) => { setCreateOpen(open); if (!open) setEditSoftware(null); }}
        software={editSoftware}
        onSubmit={async (data) => {
          try {
            if (editSoftware) {
              await updateMut.mutateAsync({ id: editSoftware.id, data });
              toast.success('Đã cập nhật');
            } else {
              await createMut.mutateAsync(data);
              toast.success('Đã thêm phần mềm mới');
            }
            setCreateOpen(false);
            setEditSoftware(null);
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lỗi khi lưu');
          }
        }}
        isLoading={createMut.isPending || updateMut.isPending}
      />

      {/* ========================= */}
      {/* INSTALL DIALOG            */}
      {/* ========================= */}
      <InstallDialog
        softwareId={installOpen}
        onOpenChange={(open) => !open && setInstallOpen(null)}
      />
    </div>
  );
}

// ========================= //
// SOFTWARE FORM DIALOG      //
// ========================= //
function SoftwareFormDialog({ open, onOpenChange, software, onSubmit, isLoading }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  software: Software | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState<any>({});

  const initForm = useCallback(() => {
    if (software) {
      setForm({
        name: software.name, vendor: software.vendor || '', version: software.version || '',
        licenseType: software.licenseType, licenseKey: software.licenseKey || '',
        maxInstalls: software.maxInstalls || '', purchaseDate: software.purchaseDate?.split('T')[0] || '',
        expiryDate: software.expiryDate?.split('T')[0] || '', cost: software.cost || '',
        note: software.note || '', status: software.status || 'ACTIVE',
      });
    } else {
      setForm({
        name: '', vendor: '', version: '', licenseType: 'FREE', licenseKey: '',
        maxInstalls: '', purchaseDate: '', expiryDate: '', cost: '', note: '', status: 'ACTIVE',
      });
    }
  }, [software]);

  useMemo(() => { if (open) initForm(); }, [open, initForm]);

  const handleSubmit = () => {
    if (!form.name) { toast.error('Nhập tên phần mềm'); return; }
    const data: any = { ...form };
    if (data.maxInstalls) data.maxInstalls = parseInt(data.maxInstalls);
    else delete data.maxInstalls;
    if (data.cost) data.cost = parseInt(data.cost);
    else delete data.cost;
    Object.keys(data).forEach(k => { if (data[k] === '') delete data[k]; });
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{software ? 'Chỉnh sửa phần mềm' : 'Thêm phần mềm mới'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tên phần mềm *</Label>
              <Input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="Windows 11 Pro" />
            </div>
            <div>
              <Label>Vendor</Label>
              <Input value={form.vendor || ''} onChange={e => setForm((f: any) => ({ ...f, vendor: e.target.value }))} placeholder="Microsoft" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Version</Label>
              <Input value={form.version || ''} onChange={e => setForm((f: any) => ({ ...f, version: e.target.value }))} placeholder="23H2" />
            </div>
            <div>
              <Label>Loại license</Label>
              <Select value={form.licenseType || 'FREE'} onValueChange={v => setForm((f: any) => ({ ...f, licenseType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LICENSE_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>License Key</Label>
            <Input value={form.licenseKey || ''} onChange={e => setForm((f: any) => ({ ...f, licenseKey: e.target.value }))} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" className="font-mono" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Max cài đặt</Label>
              <Input type="number" value={form.maxInstalls || ''} onChange={e => setForm((f: any) => ({ ...f, maxInstalls: e.target.value }))} placeholder="∞" />
            </div>
            <div>
              <Label>Chi phí (VNĐ)</Label>
              <Input type="number" value={form.cost || ''} onChange={e => setForm((f: any) => ({ ...f, cost: e.target.value }))} placeholder="0" />
            </div>
            {software && (
              <div>
                <Label>Trạng thái</Label>
                <Select value={form.status || 'ACTIVE'} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ngày mua</Label>
              <Input type="date" value={form.purchaseDate || ''} onChange={e => setForm((f: any) => ({ ...f, purchaseDate: e.target.value }))} />
            </div>
            <div>
              <Label>Hết hạn</Label>
              <Input type="date" value={form.expiryDate || ''} onChange={e => setForm((f: any) => ({ ...f, expiryDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Ghi chú</Label>
            <Textarea value={form.note || ''} onChange={e => setForm((f: any) => ({ ...f, note: e.target.value }))} rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
            {isLoading ? 'Đang lưu...' : (software ? 'Cập nhật' : 'Thêm phần mềm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========================= //
// INSTALL DIALOG            //
// ========================= //
function InstallDialog({ softwareId, onOpenChange }: {
  softwareId: string | null;
  onOpenChange: (v: boolean) => void;
}) {
  const [assetId, setAssetId] = useState('');
  const [searchAsset, setSearchAsset] = useState('');
  const [note, setNote] = useState('');
  const installMut = useInstallSoftware();

  const { data: assetsData } = useHardwareAssets({
    search: searchAsset || undefined,
    limit: 20,
  });
  const assets = assetsData?.data || [];

  const handleInstall = async () => {
    if (!softwareId || !assetId) { toast.error('Chọn thiết bị'); return; }
    try {
      await installMut.mutateAsync({ softwareId, assetId, note: note || undefined });
      toast.success('Đã cài đặt phần mềm');
      setAssetId('');
      setNote('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi cài đặt');
    }
  };

  return (
    <Dialog open={!!softwareId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cài phần mềm lên thiết bị</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tìm thiết bị</Label>
            <Input placeholder="Tìm mã, tên, hostname..." value={searchAsset} onChange={e => setSearchAsset(e.target.value)} className="mb-2" />
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger><SelectValue placeholder="Chọn thiết bị" /></SelectTrigger>
              <SelectContent>
                {assets.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} — {a.name} {a.hostname ? `(${a.hostname})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ghi chú</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Ghi chú khi cài..." />
          </div>
          <Button onClick={handleInstall} disabled={installMut.isPending || !assetId} className="w-full">
            {installMut.isPending ? 'Đang cài...' : 'Cài đặt'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
