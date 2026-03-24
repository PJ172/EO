"use client";

import { CheckInWidget } from "@/components/timekeeping/check-in-widget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAttendanceHistory } from "@/services/timekeeping.service";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { vi } from "date-fns/locale/vi";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";
import { useTableColumns, ColumnDef } from "@/hooks/use-table-columns";
import { Columns3, MoreHorizontal, FileDown, Upload, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const TIMEKEEPING_DEFAULT_COLUMNS: ColumnDef[] = [
    { key: "date", label: "Ngày" },
    { key: "checkIn", label: "Vào" },
    { key: "checkOut", label: "Ra" },
    { key: "workMinutes", label: "Tổng giờ" },
    { key: "status", label: "Trạng thái" },
];

export default function TimekeepingPage() {
    const today = new Date();
    // Simple fetch for current month
    const { data: history, isLoading, refetch } = useAttendanceHistory({
        from: format(startOfMonth(today), "yyyy-MM-dd"),
        to: format(endOfMonth(today), "yyyy-MM-dd"),
    });

    const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
    const { visibleColumns, allColumns } = useTableColumns("timekeeping", TIMEKEEPING_DEFAULT_COLUMNS);

    const handleExport = () => toast.info("Tính năng Xuất Excel đang được phát triển...");
    const handleImport = () => toast.info("Tính năng Nhập Excel đang được phát triển...");

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PRESENT": return <Badge className="bg-green-500">Đúng giờ</Badge>;
            case "LATE": return <Badge className="bg-orange-500">Đi muộn</Badge>;
            case "EARLY_LEAVE": return <Badge className="bg-yellow-500">Về sớm</Badge>;
            case "ABSENT": return <Badge variant="destructive">Vắng mặt</Badge>;
            case "ON_LEAVE": return <Badge className="bg-blue-500">Nghỉ phép</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <PageHeader
                    title="Chấm Công Nhân Viên"
                    icon={
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-700">
                            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                        </div>
                    }
                    onRefresh={refetch}
                    isRefreshing={isLoading}
                    className="mb-0 border-none bg-transparent p-0 shadow-none"
                >
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-10">
                            <MoreHorizontal className="mr-2 h-4 w-4" />
                            Tùy chọn
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                        <PermissionGate permission="EXPORT_DATA">
                            <DropdownMenuItem onClick={handleExport} className="py-2.5 cursor-pointer">
                                <FileDown className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Xuất dữ liệu Excel</span>
                            </DropdownMenuItem>
                        </PermissionGate>
                        <PermissionGate permission="IMPORT_DATA">
                            <DropdownMenuItem onClick={handleImport} className="py-2.5 cursor-pointer">
                                <Upload className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span>Nhập dữ liệu Excel</span>
                            </DropdownMenuItem>
                        </PermissionGate>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsColumnConfigOpen(true)} className="py-2.5 cursor-pointer">
                            <Columns3 className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>Sắp xếp cột</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </PageHeader>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <CheckInWidget />
                </div>

                <div className="md:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Lịch sử chấm công tháng {format(today, "MM/yyyy")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                                        <TableRow className="hover:bg-transparent border-none">
                                            {visibleColumns.map(col => (
                                                <TableHead key={col.key} className="h-10 font-medium">{col.label}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow><TableCell colSpan={visibleColumns.length} className="text-center">Đang tải...</TableCell></TableRow>
                                        ) : history?.length === 0 ? (
                                            <TableRow><TableCell colSpan={visibleColumns.length} className="text-center">Chưa có dữ liệu chấm công</TableCell></TableRow>
                                        ) : (
                                            history?.map((record) => (
                                                <TableRow key={record.id}>
                                                    {visibleColumns.map(col => {
                                                        const renderers: Record<string, () => React.ReactNode> = {
                                                            date: () => <span className="font-medium">{format(new Date(record.date), "dd/MM/yyyy")}</span>,
                                                            checkIn: () => <span>{record.checkIn ? format(new Date(record.checkIn), "HH:mm") : "-"}</span>,
                                                            checkOut: () => <span>{record.checkOut ? format(new Date(record.checkOut), "HH:mm") : "-"}</span>,
                                                            workMinutes: () => <span>{record.workMinutes ? `${Math.floor(record.workMinutes / 60)}h ${record.workMinutes % 60} p` : "-"}</span>,
                                                            status: () => getStatusBadge(record.status),
                                                        };
                                                        const render = renderers[col.key];
                                                        return <TableCell key={col.key}>{render ? render() : '—'}</TableCell>;
                                                    })}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ColumnConfigDialog
                open={isColumnConfigOpen}
                onOpenChange={setIsColumnConfigOpen}
                moduleKey="timekeeping"
                allColumns={allColumns}
                defaultColumns={TIMEKEEPING_DEFAULT_COLUMNS}
            />
        </div>
    );
}
