'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    LayoutDashboard, Monitor, HardDrive, Ticket, BarChart3, ArrowRight,
    Server, Laptop, Printer, Wifi, Camera, AlertTriangle, Shield, Clock,
    CheckCircle2, Zap, TrendingUp, Activity, Package, Users, Loader2,
    ChevronRight, ExternalLink, Timer,
} from 'lucide-react';
import { useDashboardSummary } from '@/services/hardware.service';
import { useTicketStatistics } from '@/services/ticket.service';
import { formatDistanceToNow, format, isPast, differenceInHours } from 'date-fns';
import { vi } from 'date-fns/locale';

// Mini donut for KPI
function MiniDonut({ value, max, color, size = 48 }: { value: number; max: number; color: string; size?: number }) {
    const pct = max > 0 ? Math.min(value / max, 1) : 0;
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    return (
        <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/20" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
                strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
    );
}

const ASSET_TYPE_ICONS: Record<string, any> = {
    SERVER: Server, WORKSTATION: Monitor, LAPTOP: Laptop, DESKTOP: Monitor,
    PRINTER: Printer, SWITCH: Wifi, ROUTER: Wifi, ACCESS_POINT: Wifi, CAMERA: Camera,
};
const ASSET_TYPE_LABELS: Record<string, string> = {
    SERVER: 'Server', WORKSTATION: 'Workstation', LAPTOP: 'Laptop', DESKTOP: 'Desktop',
    PRINTER: 'Máy in', SWITCH: 'Switch', ROUTER: 'Router', ACCESS_POINT: 'AP',
    CAMERA: 'Camera', DVR: 'Đầu ghi', MONITOR: 'Màn hình', OTHER: 'Khác',
};
const STATUS_LABELS: Record<string, string> = {
    AVAILABLE: 'Sẵn sàng', IN_USE: 'Đang dùng', MAINTENANCE: 'Bảo trì', RETIRED: 'Thanh lý', BROKEN: 'Hỏng',
};
const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: 'bg-emerald-500', IN_USE: 'bg-blue-500', MAINTENANCE: 'bg-amber-500', RETIRED: 'bg-slate-400', BROKEN: 'bg-red-500',
};

export default function ITDashboardPage() {
    // 1 API call instead of 3 (dashboard-stats + statistics + warranty-alerts)
    const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
    const { data: ticketStats, isLoading: ticketLoading } = useTicketStatistics();

    const isLoading = summaryLoading || ticketLoading;

    const totalAssets = summary?.total || 0;
    const inUse = useMemo(() =>
        (summary?.byStatus || []).find((s: any) => s.status === 'IN_USE')?.count || 0, [summary]);
    const available = useMemo(() =>
        (summary?.byStatus || []).find((s: any) => s.status === 'AVAILABLE')?.count || 0, [summary]);
    const maintenance = useMemo(() =>
        (summary?.byStatus || []).find((s: any) => s.status === 'MAINTENANCE')?.count || 0, [summary]);

    const openTickets = useMemo(() =>
        (ticketStats?.byStatus || []).reduce((sum: number, s: any) =>
            ['DRAFT', 'DEPT_PENDING', 'IT_PENDING', 'IN_PROGRESS'].includes(s.status) ? sum + s.count : sum, 0), [ticketStats]);

    const assetTypes = useMemo(() =>
        (summary?.byAssetType || [])
            .map((t: any) => ({ type: t.type || t.assetType || 'OTHER', count: t.count }))
            .sort((a: any, b: any) => b.count - a.count)
            .slice(0, 8), [summary]);

    const statusBreakdown = useMemo(() =>
        (summary?.byStatus || []).map((s: any) => ({
            status: s.status, count: s.count,
        })), [summary]);

    const topDepts = useMemo(() =>
        (summary?.byDepartment || []).sort((a: any, b: any) => b.count - a.count).slice(0, 5),
    [summary]);

    const warrantyCount = summary?.warrantyAlerts || 0;
    const recentAssets = summary?.recentAssets || [];

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            {/* Header */}
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-blue-600 to-cyan-500">
                            <LayoutDashboard className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">IT DASHBOARD</h1>
                            <p className="text-xs text-muted-foreground">Tổng quan quản lý CNTT — Phần cứng · Phần mềm · Helpdesk</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        Cập nhật: {format(new Date(), 'dd/MM/yyyy HH:mm')}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
                <ScrollArea className="flex-1">
                    <div className="space-y-4 pb-4">
                        {/* Row 1: KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
                            {/* Total Assets */}
                            <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all group">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tổng thiết bị</p>
                                            <p className="text-2xl font-black mt-1 tabular-nums">{totalAssets}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{inUse} đang dùng</p>
                                        </div>
                                        <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
                                            <Monitor className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </CardContent>
                            </Card>

                            {/* Available */}
                            <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all group">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sẵn sàng</p>
                                            <p className="text-2xl font-black mt-1 tabular-nums text-emerald-600">{available}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">Có thể cấp phát</p>
                                        </div>
                                        <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                                            <CheckCircle2 className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </CardContent>
                            </Card>

                            {/* Maintenance */}
                            <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all group">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bảo trì</p>
                                            <p className="text-2xl font-black mt-1 tabular-nums text-amber-600">{maintenance}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">Đang sửa chữa</p>
                                        </div>
                                        <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
                                            <Activity className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </CardContent>
                            </Card>

                            {/* Tickets */}
                            <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all group">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ticket mở</p>
                                            <p className="text-2xl font-black mt-1 tabular-nums text-indigo-600">{openTickets}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">/{ticketStats?.total || 0} tổng</p>
                                        </div>
                                        <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 shadow-sm">
                                            <Ticket className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </CardContent>
                            </Card>

                            {/* SLA */}
                            <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all group">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">SLA đạt</p>
                                            <p className={`text-2xl font-black mt-1 tabular-nums ${(ticketStats?.slaCompliancePercent || 100) >= 90 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {ticketStats?.slaCompliancePercent || 100}%
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">TB {ticketStats?.avgResolutionHours || 0}h xử lý</p>
                                        </div>
                                        <div className="relative">
                                            <MiniDonut value={ticketStats?.slaCompliancePercent || 100} max={100}
                                                color={(ticketStats?.slaCompliancePercent || 100) >= 90 ? '#10b981' : '#ef4444'} />
                                            <Shield className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </CardContent>
                            </Card>

                            {/* Warranty Alerts */}
                            <Card className={`relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all group ${warrantyCount > 0 ? 'ring-1 ring-red-200' : ''}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cảnh báo BH</p>
                                            <p className={`text-2xl font-black mt-1 tabular-nums ${warrantyCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{warrantyCount}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">Trong 90 ngày</p>
                                        </div>
                                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shadow-sm ${warrantyCount > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600 animate-pulse' : 'bg-gradient-to-br from-emerald-500 to-green-600'}`}>
                                            <AlertTriangle className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                    <div className={`absolute bottom-0 left-0 right-0 h-1 ${warrantyCount > 0 ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-emerald-500 to-green-600'} opacity-0 group-hover:opacity-100 transition-opacity`} />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Row 2: Asset Overview + Quick Nav */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in duration-500 delay-200">
                            {/* Asset Type Distribution */}
                            <Card className="lg:col-span-2 overflow-hidden hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                            <Package className="h-4 w-4 text-blue-500" /> Thiết bị theo loại
                                        </CardTitle>
                                        <CardDescription className="text-xs">Phân bổ thiết bị CNTT trong hệ thống</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="sm" asChild className="text-xs">
                                        <Link href="/cntt/hardware">Xem tất cả <ChevronRight className="h-3 w-3 ml-1" /></Link>
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {assetTypes.map((t: any) => {
                                            const Icon = ASSET_TYPE_ICONS[t.type] || Monitor;
                                            return (
                                                <div key={t.type} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center shrink-0">
                                                        <Icon className="h-4 w-4 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-bold tabular-nums leading-tight">{t.count}</p>
                                                        <p className="text-[10px] text-muted-foreground">{ASSET_TYPE_LABELS[t.type] || t.type}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Navigation */}
                            <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-amber-500" /> Truy cập nhanh
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {[
                                        { href: '/cntt/hardware', icon: Monitor, label: 'Quản lý Thiết bị', desc: 'CRUD, gán, thu hồi', color: 'from-blue-500 to-blue-600' },
                                        { href: '/cntt/software', icon: HardDrive, label: 'Phần mềm & License', desc: 'Cài đặt, giám sát', color: 'from-emerald-500 to-teal-600' },
                                        { href: '/cntt/helpdesk', icon: Ticket, label: 'IT Helpdesk', desc: 'Kanban, SLA tracking', color: 'from-orange-500 to-red-600' },
                                        { href: '/cntt/reports', icon: BarChart3, label: 'Báo cáo & Phân tích', desc: 'Charts, warranty', color: 'from-teal-500 to-cyan-600' },
                                    ].map(item => (
                                        <Link key={item.href} href={item.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-all group border border-transparent hover:border-border/50">
                                            <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 shadow-sm`}>
                                                <item.icon className="h-4 w-4 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold group-hover:text-blue-600 transition-colors">{item.label}</p>
                                                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Row 3: Status + Departments + Recent */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500 delay-300">
                            {/* Status Breakdown */}
                            <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-indigo-500" /> Trạng thái thiết bị
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {statusBreakdown.map((s: any) => {
                                        const pct = totalAssets > 0 ? Math.round((s.count / totalAssets) * 100) : 0;
                                        return (
                                            <div key={s.status}>
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[s.status] || 'bg-slate-400'}`} />
                                                        <span className="text-muted-foreground">{STATUS_LABELS[s.status] || s.status}</span>
                                                    </div>
                                                    <span className="font-bold tabular-nums">{s.count} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                                                </div>
                                                <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-700 ${STATUS_COLORS[s.status] || 'bg-slate-400'}`}
                                                        style={{ width: `${Math.max(pct, 2)}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>

                            {/* Top Departments */}
                            <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Users className="h-4 w-4 text-teal-500" /> Top phòng ban sử dụng
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {topDepts.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-6 italic">Chưa có dữ liệu</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {topDepts.map((d: any, i: number) => (
                                                <div key={d.department} className="flex items-center gap-3">
                                                    <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                                                        i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                                                        i === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                                                        i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                                                        'bg-slate-300'
                                                    }`}>{i + 1}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium truncate">{d.department}</p>
                                                    </div>
                                                    <Badge variant="secondary" className="text-[10px] h-5 tabular-nums">{d.count}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Recent Assets */}
                            <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-blue-500" /> Thiết bị mới nhất
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" asChild className="text-xs h-7">
                                        <Link href="/cntt/hardware">Tất cả <ChevronRight className="h-3 w-3 ml-0.5" /></Link>
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {recentAssets.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-6 italic">Chưa có thiết bị</p>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {recentAssets.slice(0, 6).map((asset: any) => (
                                                <div key={asset.id} className="flex items-center gap-2.5 group">
                                                    <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
                                                        <Monitor className="h-3.5 w-3.5 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium truncate group-hover:text-blue-600 transition-colors">{asset.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{asset.code} · {asset.category?.name}</p>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                        {formatDistanceToNow(new Date(asset.createdAt), { addSuffix: true, locale: vi })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Row 4: Warranty Alert Banner (if any) */}
                        {warrantyCount > 0 && (
                            <Card className="overflow-hidden border-red-200 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 animate-in fade-in duration-500 delay-400">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shrink-0 shadow-sm">
                                            <AlertTriangle className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-red-700 dark:text-red-400">
                                                ⚠️ {warrantyCount} thiết bị sắp hết bảo hành trong 90 ngày
                                            </p>
                                            <p className="text-xs text-red-600/70 dark:text-red-300/70 mt-0.5">
                                                Cần lên kế hoạch gia hạn hoặc thay thế để tránh gián đoạn hoạt động
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm" asChild className="border-red-200 text-red-700 hover:bg-red-100 shrink-0">
                                            <Link href="/cntt/reports">
                                                Xem chi tiết <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}
