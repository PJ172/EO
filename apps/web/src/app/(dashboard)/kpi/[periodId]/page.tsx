"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { PermissionGate } from "@/components/auth/permission-gate";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useState, useMemo } from "react";
import {
    ArrowLeft,
    Plus,
    Search,
    FileEdit,
    Send,
    CheckCircle,
    Lock,
    Users,
    Target,
    BarChart3,
    TrendingUp,
    Loader2,
} from "lucide-react";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";
import { useTableColumns, ColumnDef } from "@/hooks/use-table-columns";
import { Columns3, MoreHorizontal, FileDown, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const KPI_DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "employee", label: "Nhân viên" },
    { key: "department", label: "Phòng ban" },
    { key: "itemCount", label: "Số chỉ tiêu" },
    { key: "score", label: "Điểm" },
    { key: "status", label: "Trạng thái" },
];

interface KPIPeriod {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
}

interface KPIItem {
    id: string;
    name: string;
    target: string;
    actual: string | null;
    weight: number;
    score: number | null;
    comment: string | null;
}

interface EmployeeKPI {
    id: string;
    employeeId: string;
    periodId: string;
    totalScore: number | null;
    status: "DRAFT" | "SUBMITTED" | "REVIEWED" | "FINALIZED";
    evaluatorId: string | null;
    items: KPIItem[];
    employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
        department?: { name: string };
    };
}

interface PeriodSummary {
    total: number;
    draft: number;
    submitted: number;
    reviewed: number;
    finalized: number;
    averageScore: number;
}

const STATUS_CONFIG = {
    DRAFT: { label: "Nháp", variant: "secondary" as const, icon: FileEdit, color: "text-gray-500" },
    SUBMITTED: { label: "Đã gửi", variant: "default" as const, icon: Send, color: "text-blue-500" },
    REVIEWED: { label: "Đã đánh giá", variant: "outline" as const, icon: CheckCircle, color: "text-orange-500" },
    FINALIZED: { label: "Đã chốt", variant: "default" as const, icon: Lock, color: "text-green-500" },
};

export default function KPIPeriodDetailPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const periodId = params.periodId as string;

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [activeTab, setActiveTab] = useState("active");
    const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
    const { visibleColumns, allColumns } = useTableColumns("kpi", KPI_DEFAULT_COLUMNS);

    const { data: period, isLoading: periodLoading } = useQuery({
        queryKey: ["kpi-period", periodId],
        queryFn: () => apiGet<KPIPeriod>(`/kpi/periods/${periodId}`).catch(() => null),
        enabled: !!periodId,
    });

    const { data: kpis, isLoading: kpisLoading } = useQuery({
        queryKey: ["kpi-period-kpis", periodId],
        queryFn: () => apiGet<EmployeeKPI[]>(`/kpi/periods/${periodId}/kpis`),
        enabled: !!periodId,
    });

    const { data: summary } = useQuery({
        queryKey: ["kpi-period-summary", periodId],
        queryFn: () => apiGet<PeriodSummary>(`/kpi/periods/${periodId}/summary`),
        enabled: !!periodId,
    });

    const submitMutation = useMutation({
        mutationFn: (kpiId: string) => apiPost(`/kpi/${kpiId}/submit`, {}),
        onSuccess: () => {
            toast.success("Đã gửi KPI để đánh giá!");
            queryClient.invalidateQueries({ queryKey: ["kpi-period-kpis", periodId] });
            queryClient.invalidateQueries({ queryKey: ["kpi-period-summary", periodId] });
        },
        onError: () => toast.error("Lỗi khi gửi KPI"),
    });

    const reviewMutation = useMutation({
        mutationFn: (kpiId: string) => apiPost(`/kpi/${kpiId}/review`, {}),
        onSuccess: () => {
            toast.success("Đã đánh giá KPI!");
            queryClient.invalidateQueries({ queryKey: ["kpi-period-kpis", periodId] });
            queryClient.invalidateQueries({ queryKey: ["kpi-period-summary", periodId] });
        },
        onError: () => toast.error("Lỗi khi đánh giá KPI"),
    });

    const finalizeMutation = useMutation({
        mutationFn: (kpiId: string) => apiPost(`/kpi/${kpiId}/finalize`, {}),
        onSuccess: () => {
            toast.success("Đã chốt KPI!");
            queryClient.invalidateQueries({ queryKey: ["kpi-period-kpis", periodId] });
            queryClient.invalidateQueries({ queryKey: ["kpi-period-summary", periodId] });
        },
        onError: () => toast.error("Lỗi khi chốt KPI"),
    });

    const deleteMutation = useMutation({
        mutationFn: (kpiId: string) => apiGet(`/kpi/${kpiId}`).then(res => fetch(`/api/kpi/${kpiId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })),
        onSuccess: () => {
            toast.success("Đã xóa KPI!");
            queryClient.invalidateQueries({ queryKey: ["kpi-period-kpis", periodId] });
            queryClient.invalidateQueries({ queryKey: ["kpi-period-summary", periodId] });
        },
        onError: () => toast.error("Lỗi khi xóa KPI"),
    });


    const filteredKPIs = useMemo(() => {
        if (!kpis) return [];
        return kpis.filter((kpi) => {
            const matchSearch = !searchQuery ||
                kpi.employee?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                kpi.employee?.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchStatus = statusFilter === "all" || kpi.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [kpis, searchQuery, statusFilter]);

    if (periodLoading) {
        return <PageSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/kpi")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Target className="h-6 w-6" />
                            {period?.name || "Kỳ đánh giá"}
                        </h1>
                        <p className="text-muted-foreground">
                            {period && (
                                <>
                                    {format(new Date(period.startDate), "dd/MM/yyyy", { locale: vi })} -{" "}
                                    {format(new Date(period.endDate), "dd/MM/yyyy", { locale: vi })}
                                    {period.isActive && (
                                        <Badge className="ml-2 bg-green-100 text-green-700">Đang hoạt động</Badge>
                                    )}
                                </>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => router.push(`/kpi/${periodId}/assign`)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Gán KPI
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <MoreHorizontal className="mr-2 h-4 w-4" />
                                Tùy chọn
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                            <PermissionGate permission="EXPORT_DATA">
                                <DropdownMenuItem onClick={() => {
                                    window.open(`/api/kpi/periods/${periodId}/export/excel`, '_blank');
                                }} className="py-2.5 cursor-pointer">
                                    <FileDown className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <span>Xuất dữ liệu Excel</span>
                                </DropdownMenuItem>
                            </PermissionGate>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setIsColumnConfigOpen(true)} className="py-2.5 cursor-pointer">
                                <Columns3 className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span>Sắp xếp cột</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card className="bg-gradient-to-br from-gray-500/10 to-gray-600/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Tổng cộng</p>
                                <p className="text-2xl font-bold">{summary?.total || 0}</p>
                            </div>
                            <Users className="h-8 w-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Nháp</p>
                                <p className="text-2xl font-bold text-blue-600">{summary?.draft || 0}</p>
                            </div>
                            <FileEdit className="h-8 w-8 text-blue-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Đã gửi</p>
                                <p className="text-2xl font-bold text-yellow-600">{summary?.submitted || 0}</p>
                            </div>
                            <Send className="h-8 w-8 text-yellow-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Đã đánh giá</p>
                                <p className="text-2xl font-bold text-orange-600">{summary?.reviewed || 0}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-orange-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Đã chốt</p>
                                <p className="text-2xl font-bold text-green-600">{summary?.finalized || 0}</p>
                            </div>
                            <Lock className="h-8 w-8 text-green-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Average Score */}
            {summary && summary.averageScore > 0 && (
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <TrendingUp className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Điểm trung bình (đã chốt)</p>
                                <p className="text-2xl font-bold">{summary.averageScore} / 100</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm theo tên, mã nhân viên..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="DRAFT">Nháp</SelectItem>
                        <SelectItem value="SUBMITTED">Đã gửi</SelectItem>
                        <SelectItem value="REVIEWED">Đã đánh giá</SelectItem>
                        <SelectItem value="FINALIZED">Đã chốt</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* KPIs Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Danh sách KPI nhân viên
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {kpisLoading ? (
                        <TableSkeleton />
                    ) : (
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                                <TableRow>
                                    {visibleColumns.map(col => (
                                        <TableHead key={col.key} className={col.key === 'itemCount' || col.key === 'score' ? 'text-center' : ''}>{col.label}</TableHead>
                                    ))}
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredKPIs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                                            {searchQuery || statusFilter !== "all"
                                                ? "Không tìm thấy KPI phù hợp"
                                                : 'Chưa có KPI nào. Bấm "Gán KPI" để bắt đầu.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredKPIs.map((kpi) => {
                                        const config = STATUS_CONFIG[kpi.status];
                                        const StatusIcon = config.icon;
                                        return (
                                            <TableRow key={kpi.id}>
                                                {visibleColumns.map(col => {
                                                    const renderers: Record<string, () => React.ReactNode> = {
                                                        employee: () => <div><p className="font-medium">{kpi.employee?.fullName || kpi.employeeId}</p><p className="text-xs text-muted-foreground">{kpi.employee?.employeeCode}</p></div>,
                                                        department: () => <span>{kpi.employee?.department?.name || "-"}</span>,
                                                        itemCount: () => <div className="text-center"><Badge variant="secondary">{kpi.items?.length || 0}</Badge></div>,
                                                        score: () => <div className="text-center">{kpi.totalScore !== null ? <span className="font-semibold">{Number(kpi.totalScore).toFixed(1)}</span> : <span className="text-muted-foreground">-</span>}</div>,
                                                        status: () => <Badge variant={config.variant} className="gap-1"><StatusIcon className="h-3 w-3" />{config.label}</Badge>,
                                                    };
                                                    const render = renderers[col.key];
                                                    return <TableCell key={col.key}>{render ? render() : '—'}</TableCell>;
                                                })}
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {kpi.status !== "FINALIZED" && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => router.push(`/kpi/${periodId}/kpis/${kpi.id}/score`)}
                                                            >
                                                                <FileEdit className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {kpi.status === "DRAFT" && (
                                                            <Button size="sm" variant="ghost" onClick={() => submitMutation.mutate(kpi.id)} disabled={submitMutation.isPending}>
                                                                <Send className="h-4 w-4 text-blue-500" />
                                                            </Button>
                                                        )}
                                                        {kpi.status === "SUBMITTED" && (
                                                            <Button size="sm" variant="ghost" onClick={() => reviewMutation.mutate(kpi.id)} disabled={reviewMutation.isPending}>
                                                                <CheckCircle className="h-4 w-4 text-orange-500" />
                                                            </Button>
                                                        )}
                                                        {kpi.status === "REVIEWED" && (
                                                            <Button size="sm" variant="ghost" onClick={() => finalizeMutation.mutate(kpi.id)} disabled={finalizeMutation.isPending}>
                                                                <Lock className="h-4 w-4 text-green-500" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                if (confirm("Xóa KPI này?")) {
                                                                    deleteMutation.mutate(kpi.id);
                                                                }
                                                            }}
                                                            disabled={deleteMutation.isPending}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <ColumnConfigDialog
                open={isColumnConfigOpen}
                onOpenChange={setIsColumnConfigOpen}
                moduleKey="kpi"
                allColumns={allColumns}
                defaultColumns={KPI_DEFAULT_COLUMNS}
            />
        </div>
    );
}

function PageSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid gap-4 md:grid-cols-5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i}>
                        <CardContent className="pt-6">
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Skeleton className="h-[400px] w-full" />
        </div>
    );
}

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
            ))}
        </div>
    );
}
