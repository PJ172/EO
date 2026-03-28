'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    BarChart3, PieChart, TrendingUp, Download, Monitor, HardDrive,
    Ticket, AlertTriangle, Shield, Clock, CheckCircle2, Server,
    Laptop, Printer, Wifi, Camera, Loader2, FileDown, Calendar,
    Activity, Zap, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useDashboardSummary } from '@/services/hardware.service';
import { useTicketStatistics } from '@/services/ticket.service';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// Inline lightweight chart components (no external chart library needed)
function BarChartSimple({ data, colors }: { data: { label: string; value: number; color?: string }[]; colors?: string[] }) {
    const max = Math.max(...data.map(d => d.value), 1);
    const defaultColors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500'];
    return (
        <div className="space-y-2.5">
            {data.map((item, i) => (
                <div key={item.label} className="group">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground truncate max-w-[180px] group-hover:text-foreground transition-colors">{item.label}</span>
                        <span className="font-bold tabular-nums">{item.value}</span>
                    </div>
                    <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${item.color || (colors ? colors[i % colors.length] : defaultColors[i % defaultColors.length])}`}
                            style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function DonutChart({ data, size = 140 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return <div className="flex items-center justify-center" style={{ width: size, height: size }}><p className="text-xs text-muted-foreground">Không có dữ liệu</p></div>;
    const radius = (size - 20) / 2;
    const center = size / 2;
    const strokeWidth = 24;
    const innerRadius = radius - strokeWidth / 2;
    const circumference = 2 * Math.PI * innerRadius;
    let offset = 0;

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {data.map((d, i) => {
                    const pct = d.value / total;
                    const dashLength = pct * circumference;
                    const dashOffset = offset * circumference;
                    offset += pct;
                    return (
                        <circle
                            key={i}
                            cx={center} cy={center} r={innerRadius}
                            fill="none" stroke={d.color} strokeWidth={strokeWidth}
                            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                            strokeDashoffset={-dashOffset}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">{total}</span>
                <span className="text-[10px] text-muted-foreground">Tổng</span>
            </div>
        </div>
    );
}

function StatMiniCard({ icon: Icon, label, value, change, changeType, color }: {
    icon: any; label: string; value: string | number; change?: string; changeType?: 'up' | 'down' | 'neutral'; color: string;
}) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-md transition-all group">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider truncate">{label}</p>
                <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold">{value}</span>
                    {change && (
                        <span className={`text-[10px] font-semibold flex items-center ${changeType === 'up' ? 'text-emerald-600' : changeType === 'down' ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {changeType === 'up' ? <ArrowUpRight className="h-3 w-3" /> : changeType === 'down' ? <ArrowDownRight className="h-3 w-3" /> : null}
                            {change}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// Status/type label maps
const STATUS_LABELS: Record<string, string> = {
    AVAILABLE: 'Sẵn sàng', IN_USE: 'Đang sử dụng', MAINTENANCE: 'Bảo trì',
    RETIRED: 'Thanh lý', BROKEN: 'Hỏng', RESERVED: 'Đặt trước',
};
const ASSET_TYPE_ICONS: Record<string, any> = {
    SERVER: Server, WORKSTATION: Monitor, LAPTOP: Laptop, DESKTOP: Monitor,
    PRINTER: Printer, SWITCH: Wifi, ROUTER: Wifi, ACCESS_POINT: Wifi,
    CAMERA: Camera, DVR: Camera, MONITOR: Monitor,
};
const ASSET_TYPE_LABELS: Record<string, string> = {
    SERVER: 'Server', WORKSTATION: 'Workstation', LAPTOP: 'Laptop', DESKTOP: 'Desktop',
    PRINTER: 'Máy in', SWITCH: 'Switch', ROUTER: 'Router', ACCESS_POINT: 'Access Point',
    CAMERA: 'Camera', DVR: 'Đầu ghi', MONITOR: 'Màn hình', OTHER: 'Khác',
};
const PRIORITY_LABELS: Record<string, string> = { URGENT: 'Khẩn cấp', HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp' };
const TICKET_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Nháp', DEPT_PENDING: 'Chờ duyệt', IT_PENDING: 'Chờ IT',
    IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết', CLOSED: 'Đã đóng', REJECTED: 'Từ chối',
};
const LICENSE_TYPE_LABELS: Record<string, string> = { PAID: 'Trả phí', FREE: 'Miễn phí', TRIAL: 'Dùng thử', OEM: 'OEM', SUBSCRIPTION: 'Thuê bao' };

const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: '#22c55e', IN_USE: '#3b82f6', MAINTENANCE: '#f59e0b', RETIRED: '#6b7280', BROKEN: '#ef4444',
};
const PRIORITY_COLORS: Record<string, string> = { URGENT: '#ef4444', HIGH: '#f97316', MEDIUM: '#3b82f6', LOW: '#94a3b8' };

export default function ReportsPage() {
    const [period, setPeriod] = useState('all');

    // 1 API call instead of 3 (statistics + dashboard-stats + warranty-alerts)
    const { data: summary, isLoading: assetLoading } = useDashboardSummary();
    const { data: ticketStats, isLoading: ticketLoading } = useTicketStatistics();

    const isLoading = assetLoading || ticketLoading;

    // Derived data for charts
    const hardwareByStatus = useMemo(() =>
        (summary?.byStatus || []).map((s: any) => ({
            label: STATUS_LABELS[s.status] || s.status,
            value: s.count,
            color: STATUS_COLORS[s.status] || '#94a3b8',
        })), [summary]);

    const hardwareByType = useMemo(() =>
        (summary?.byAssetType || []).map((t: any) => ({
            label: ASSET_TYPE_LABELS[t.assetType || t.type] || t.assetType || t.type || 'Khác',
            value: t.count,
        })), [summary]);

    const hardwareByCategory = useMemo(() =>
        (summary?.byCategory || []).map((c: any) => ({
            label: c.category || 'N/A',
            value: c.count,
        })), [summary]);

    const hardwareByDept = useMemo(() =>
        (summary?.byDepartment || []).map((d: any) => ({
            label: d.department || 'N/A',
            value: d.count,
        })).sort((a: any, b: any) => b.value - a.value).slice(0, 10),
    [summary]);

    const hardwareByCondition = useMemo(() =>
        (summary?.byCondition || []).map((c: any) => ({
            label: c.condition === 'GOOD' ? 'Tốt' : c.condition === 'FAIR' ? 'Bình thường' : c.condition === 'POOR' ? 'Kém' : c.condition || 'N/A',
            value: c.count,
            color: c.condition === 'GOOD' ? '#22c55e' : c.condition === 'FAIR' ? '#f59e0b' : '#ef4444',
        })), [summary]);

    const warrantyAlerts = summary?.warrantyAlertsList || [];

    const ticketByStatus = useMemo(() =>
        (ticketStats?.byStatus || []).map((s: any) => ({
            label: TICKET_STATUS_LABELS[s.status] || s.status,
            value: s.count,
            color: s.status === 'CLOSED' ? '#22c55e' : s.status === 'RESOLVED' ? '#10b981' : s.status === 'IN_PROGRESS' ? '#6366f1' : s.status === 'IT_PENDING' ? '#3b82f6' : s.status === 'REJECTED' ? '#ef4444' : '#f59e0b',
        })), [ticketStats]);

    const ticketByPriority = useMemo(() =>
        (ticketStats?.byPriority || []).map((p: any) => ({
            label: PRIORITY_LABELS[p.priority] || p.priority,
            value: p.count,
            color: PRIORITY_COLORS[p.priority] || '#94a3b8',
        })), [ticketStats]);

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            {/* Header */}
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-teal-500 to-cyan-600">
                            <BarChart3 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-teal-500 to-cyan-600 bg-clip-text text-transparent">BÁO CÁO & PHÂN TÍCH</h1>
                            <p className="text-xs text-muted-foreground">Tổng hợp phần cứng, phần mềm và helpdesk CNTT</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[140px] h-9">
                                <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="today">Hôm nay</SelectItem>
                                <SelectItem value="week">Tuần này</SelectItem>
                                <SelectItem value="month">Tháng này</SelectItem>
                                <SelectItem value="quarter">Quý này</SelectItem>
                                <SelectItem value="year">Năm nay</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
                <ScrollArea className="flex-1">
                    <div className="space-y-4 pb-4">
                        {/* KPI Overview Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
                            <StatMiniCard icon={Monitor} label="Tổng thiết bị" value={summary?.total || 0} color="bg-gradient-to-br from-blue-500 to-blue-600" />
                            <StatMiniCard icon={HardDrive} label="Phần mềm" value={ticketStats?.total ? '—' : '—'} color="bg-gradient-to-br from-emerald-500 to-teal-600" />
                            <StatMiniCard icon={Ticket} label="Tổng ticket" value={ticketStats?.total || 0} color="bg-gradient-to-br from-amber-500 to-orange-600" />
                            <StatMiniCard icon={Activity} label="TB xử lý" value={`${ticketStats?.avgResolutionHours || 0}h`} color="bg-gradient-to-br from-indigo-500 to-blue-600" />
                            <StatMiniCard icon={Shield} label="SLA đạt" value={`${ticketStats?.slaCompliancePercent || 100}%`} changeType={(ticketStats?.slaCompliancePercent || 100) >= 90 ? 'up' : 'down'} color="bg-gradient-to-br from-cyan-500 to-teal-600" />
                            <StatMiniCard icon={AlertTriangle} label="Cảnh báo BH" value={summary?.warrantyAlerts || 0} changeType={(summary?.warrantyAlerts || 0) > 0 ? 'down' : 'neutral'} color="bg-gradient-to-br from-red-500 to-rose-600" />
                        </div>

                        {/* Tabs */}
                        <Tabs defaultValue="hardware" className="animate-in fade-in duration-300 delay-200">
                            <TabsList className="bg-muted/50 p-1 rounded-lg">
                                <TabsTrigger value="hardware" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
                                    <Monitor className="h-3.5 w-3.5" /> Phần cứng
                                </TabsTrigger>
                                <TabsTrigger value="tickets" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
                                    <Ticket className="h-3.5 w-3.5" /> Helpdesk
                                </TabsTrigger>
                                <TabsTrigger value="warranty" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
                                    <AlertTriangle className="h-3.5 w-3.5" /> Bảo hành
                                </TabsTrigger>
                            </TabsList>

                            {/* === HARDWARE TAB === */}
                            <TabsContent value="hardware" className="mt-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* By Status - Donut */}
                                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <PieChart className="h-4 w-4 text-blue-500" /> Theo trạng thái
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between gap-4">
                                                <DonutChart data={hardwareByStatus} />
                                                <div className="space-y-1.5 flex-1">
                                                    {hardwareByStatus.map((s: any) => (
                                                        <div key={s.label} className="flex items-center gap-2">
                                                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                                            <span className="text-xs text-muted-foreground flex-1 truncate">{s.label}</span>
                                                            <span className="text-xs font-bold tabular-nums">{s.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* By Asset Type */}
                                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <Server className="h-4 w-4 text-indigo-500" /> Theo loại thiết bị
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <BarChartSimple
                                                data={hardwareByType}
                                                colors={['bg-blue-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-sky-500']}
                                            />
                                        </CardContent>
                                    </Card>

                                    {/* By Category */}
                                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <BarChart3 className="h-4 w-4 text-emerald-500" /> Theo danh mục
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <BarChartSimple
                                                data={hardwareByCategory}
                                                colors={['bg-emerald-500', 'bg-teal-500', 'bg-green-500', 'bg-lime-500']}
                                            />
                                        </CardContent>
                                    </Card>

                                    {/* By Department */}
                                    <Card className="overflow-hidden hover:shadow-md transition-shadow md:col-span-2">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-amber-500" /> Top 10 phòng ban sử dụng thiết bị
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <BarChartSimple
                                                data={hardwareByDept}
                                                colors={['bg-amber-500', 'bg-orange-500', 'bg-yellow-500', 'bg-red-400']}
                                            />
                                        </CardContent>
                                    </Card>

                                    {/* By Condition */}
                                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <Zap className="h-4 w-4 text-cyan-500" /> Tình trạng thiết bị
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between gap-4">
                                                <DonutChart data={hardwareByCondition} size={120} />
                                                <div className="space-y-1.5 flex-1">
                                                    {hardwareByCondition.map((c: any) => (
                                                        <div key={c.label} className="flex items-center gap-2">
                                                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                                                            <span className="text-xs text-muted-foreground flex-1">{c.label}</span>
                                                            <span className="text-xs font-bold">{c.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* === TICKETS TAB === */}
                            <TabsContent value="tickets" className="mt-4 space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <StatMiniCard icon={Ticket} label="Tổng ticket" value={ticketStats?.total || 0} color="bg-gradient-to-br from-blue-500 to-blue-600" />
                                    <StatMiniCard icon={CheckCircle2} label="Đã giải quyết" value={ticketStats?.totalResolved || 0} color="bg-gradient-to-br from-emerald-500 to-teal-600" />
                                    <StatMiniCard icon={Clock} label="TB xử lý" value={`${ticketStats?.avgResolutionHours || 0}h`} color="bg-gradient-to-br from-amber-500 to-orange-600" />
                                    <StatMiniCard icon={Shield} label="SLA đạt" value={`${ticketStats?.slaCompliancePercent || 100}%`} color="bg-gradient-to-br from-indigo-500 to-blue-600" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* By Status */}
                                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <PieChart className="h-4 w-4 text-blue-500" /> Ticket theo trạng thái
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between gap-4">
                                                <DonutChart data={ticketByStatus} />
                                                <div className="space-y-1.5 flex-1">
                                                    {ticketByStatus.map((s: any) => (
                                                        <div key={s.label} className="flex items-center gap-2">
                                                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                                            <span className="text-xs text-muted-foreground flex-1 truncate">{s.label}</span>
                                                            <span className="text-xs font-bold tabular-nums">{s.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* By Priority */}
                                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-orange-500" /> Ticket theo mức ưu tiên
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between gap-4">
                                                <DonutChart data={ticketByPriority} />
                                                <div className="space-y-1.5 flex-1">
                                                    {ticketByPriority.map((p: any) => (
                                                        <div key={p.label} className="flex items-center gap-2">
                                                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                                                            <span className="text-xs text-muted-foreground flex-1">{p.label}</span>
                                                            <span className="text-xs font-bold">{p.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* By Category */}
                                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <BarChart3 className="h-4 w-4 text-teal-500" /> Ticket theo danh mục
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <BarChartSimple
                                                data={(ticketStats?.byCategory || []).map((c: any) => ({ label: c.category, value: c.count }))}
                                                colors={['bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500']}
                                            />
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* SLA Performance Card */}
                                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-emerald-500" /> Hiệu suất SLA
                                        </CardTitle>
                                        <CardDescription>Tỷ lệ ticket được giải quyết đúng hạn</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-6">
                                            <div className="relative w-24 h-24">
                                                <svg className="w-24 h-24 -rotate-90">
                                                    <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                                                    <circle
                                                        cx="48" cy="48" r="40" fill="none" strokeWidth="8"
                                                        strokeDasharray={`${(ticketStats?.slaCompliancePercent || 100) * 2.51} 251.2`}
                                                        strokeLinecap="round"
                                                        className={`transition-all duration-1000 ${(ticketStats?.slaCompliancePercent || 100) >= 90 ? 'stroke-emerald-500' : (ticketStats?.slaCompliancePercent || 100) >= 70 ? 'stroke-amber-500' : 'stroke-red-500'}`}
                                                    />
                                                </svg>
                                                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                                                    {ticketStats?.slaCompliancePercent || 100}%
                                                </span>
                                            </div>
                                            <div className="space-y-2 flex-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Đã giải quyết</span>
                                                    <span className="font-bold">{ticketStats?.totalResolved || 0} ticket</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Thời gian TB</span>
                                                    <span className="font-bold">{ticketStats?.avgResolutionHours || 0} giờ</span>
                                                </div>
                                                <Separator />
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Tổng ticket</span>
                                                    <span className="font-bold">{ticketStats?.total || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* === WARRANTY TAB === */}
                            <TabsContent value="warranty" className="mt-4 space-y-4">
                                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                    <CardHeader>
                                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                                            Thiết bị sắp hết bảo hành (90 ngày)
                                            {warrantyAlerts?.length > 0 && (
                                                <Badge variant="destructive" className="ml-2 text-[10px]">{warrantyAlerts.length}</Badge>
                                            )}
                                        </CardTitle>
                                        <CardDescription>Danh sách thiết bị cần lên kế hoạch gia hạn hoặc thay thế</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {!warrantyAlerts || warrantyAlerts.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                                <CheckCircle2 className="h-10 w-10 mb-3 text-emerald-500 opacity-60" />
                                                <p className="font-medium">Không có thiết bị nào sắp hết bảo hành</p>
                                                <p className="text-xs mt-1">Tất cả đang trong tình trạng tốt</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b bg-muted/30">
                                                            <th className="text-left p-2.5 font-medium text-muted-foreground">Mã</th>
                                                            <th className="text-left p-2.5 font-medium text-muted-foreground">Tên thiết bị</th>
                                                            <th className="text-left p-2.5 font-medium text-muted-foreground">Danh mục</th>
                                                            <th className="text-left p-2.5 font-medium text-muted-foreground">Người dùng</th>
                                                            <th className="text-left p-2.5 font-medium text-muted-foreground">Phòng ban</th>
                                                            <th className="text-left p-2.5 font-medium text-muted-foreground">Hết BH</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {warrantyAlerts.map((asset: any) => {
                                                            const daysLeft = Math.ceil((new Date(asset.warrantyEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                                            return (
                                                                <tr key={asset.id} className="border-b hover:bg-muted/30 transition-colors">
                                                                    <td className="p-2.5 font-mono text-xs">{asset.code}</td>
                                                                    <td className="p-2.5 font-medium">{asset.name}</td>
                                                                    <td className="p-2.5 text-muted-foreground">{asset.category?.name}</td>
                                                                    <td className="p-2.5">{asset.assignedTo?.fullName || '—'}</td>
                                                                    <td className="p-2.5 text-muted-foreground">{asset.department?.name || '—'}</td>
                                                                    <td className="p-2.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs">{format(new Date(asset.warrantyEndDate), 'dd/MM/yyyy')}</span>
                                                                            <Badge
                                                                                variant={daysLeft <= 30 ? 'destructive' : 'secondary'}
                                                                                className="text-[10px] h-5"
                                                                            >
                                                                                {daysLeft} ngày
                                                                            </Badge>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}
