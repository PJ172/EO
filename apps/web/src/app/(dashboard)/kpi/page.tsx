"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kpiApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Plus, Trash2,
    FileDown, Upload, BarChart3,
    ArrowUpDown, ChevronUp, ChevronDown, Loader2, Calendar, Target, CheckCircle, Eye,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useState } from "react";
import { SearchBar } from "@/components/ui/search-bar";
import { useRouter } from "next/navigation";

export default function KPIPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<{ sortBy: string, order: "asc" | "desc" }>({ sortBy: "name", order: "asc" });

    const handleExport = () => toast.info("Tính năng Xuất Excel đang được phát triển...");
    const handleImport = () => toast.info("Tính năng Nhập Excel đang được phát triển...");

    const toggleSort = (field: string) => {
        setSort(prev => ({
            sortBy: field,
            order: prev.sortBy === field && prev.order === "asc" ? "desc" : "asc"
        }));
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sort.sortBy !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:bg-muted/50 rounded" />;
        return sort.order === "asc"
            ? <ChevronUp className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />
            : <ChevronDown className="ml-1 h-3.5 w-3.5 text-foreground bg-muted/50 rounded" />;
    };

    const { data: allPeriods, isLoading, refetch } = useQuery({
        queryKey: ["kpi-periods"],
        queryFn: kpiApi.getPeriods,
    });

    const periods = allPeriods?.filter((p: any) =>
        p.name.toLowerCase().includes(search.toLowerCase())
    ).sort((a: any, b: any) => {
        const aVal = a[sort.sortBy];
        const bVal = b[sort.sortBy];
        if (sort.order === "asc") return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
    });

    const deletePeriodMutation = useMutation({
        mutationFn: kpiApi.deletePeriod,
        onSuccess: () => {
            toast.success("Đã xóa kỳ đánh giá");
            queryClient.invalidateQueries({ queryKey: ["kpi-periods"] });
        },
        onError: (error: any) => {
            toast.error("Lỗi", {
                description: error.response?.data?.message || "Không thể xóa",
            });
        },
    });

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
            <PageHeader
                title="Chỉ số KPI"
                icon={
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-red-500 to-red-700">
                        <Target className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                    </div>
                }
                className="mb-0 border-none bg-transparent p-0 shadow-none"
                onRefresh={refetch}
                isRefreshing={isLoading}
                search={
                    <SearchBar
                        placeholder="Tìm kiếm kỳ đánh giá..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                }
            >
                <Button variant="outline" onClick={handleExport} className="h-10">
                    <FileDown className="mr-2 h-4 w-4" /> Xuất Excel
                </Button>
                <Button variant="outline" onClick={handleImport} className="h-10">
                    <Upload className="mr-2 h-4 w-4" /> Nhập Excel
                </Button>
                <Button className="h-10" onClick={() => router.push('/kpi/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm mới
                </Button>
            </PageHeader>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 custom-scrollbar pr-1 pb-2">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng kỳ đánh giá</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{periods?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
                        <Target className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {periods?.filter((p: any) => p.isActive).length || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Periods Table */}
            <div className="rounded-md border bg-card">
                <div className="p-4 border-b flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    <h3 className="font-semibold leading-none tracking-tight">Danh sách kỳ đánh giá</h3>
                </div>
                <div className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("name")}>
                                        <div className="flex items-center">
                                            Tên kỳ <SortIcon field="name" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("startDate")}>
                                        <div className="flex items-center">
                                            Thời gian <SortIcon field="startDate" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="h-10 font-medium">Số KPI</TableHead>
                                    <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("isActive")}>
                                        <div className="flex items-center">
                                            Trạng thái <SortIcon field="isActive" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="h-10 font-medium text-right">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {periods?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Chưa có kỳ đánh giá nào. Bấm "Thêm mới" để bắt đầu.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    periods?.map((period: any) => (
                                        <TableRow key={period.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/kpi/${period.id}`)}>
                                            <TableCell className="font-medium text-primary hover:underline">{period.name}</TableCell>
                                            <TableCell>
                                                {format(new Date(period.startDate), "dd/MM/yyyy", { locale: vi })} -{" "}
                                                {format(new Date(period.endDate), "dd/MM/yyyy", { locale: vi })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {period._count?.kpis || 0}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {period.isActive ? (
                                                    <Badge className="bg-green-100 text-green-700">
                                                        <CheckCircle className="mr-1 h-3 w-3" />
                                                        Hoạt động
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">Kết thúc</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => router.push(`/kpi/${period.id}`)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => deletePeriodMutation.mutate(period.id)}
                                                        disabled={deletePeriodMutation.isPending || (period._count?.kpis > 0)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}
