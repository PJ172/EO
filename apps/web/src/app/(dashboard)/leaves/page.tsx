"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useLeaves, useCancelLeave, useApproveLeave, LeaveRequest } from "@/services/leave.service";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, MoreHorizontal, CalendarCheck, CalendarX, Search, FileDown, Upload, ArrowUpDown, ChevronUp, ChevronDown, RotateCw, CalendarDays } from "lucide-react";
import { SearchBar } from "@/components/ui/search-bar";
import { toast } from "sonner";

export default function LeaveListPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [sort, setSort] = useState<{ sortBy: string, order: "asc" | "desc" }>({ sortBy: "createdAt", order: "desc" });

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ["leaves"] });
        setIsRefreshing(false);
    };

    const handleExport = () => toast.info("Tính năng Xuất Excel đang được phát triển...");
    const handleImport = () => toast.info("Tính năng Nhập Excel đang được phát triển...");

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <PageHeader
                    title="Nghỉ Phép"
                    icon={
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-700">
                            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                        </div>
                    }
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                    className="mb-0 border-none bg-transparent p-0 shadow-none"
                    search={
                        <SearchBar
                            placeholder="Tìm kiếm đơn nghỉ phép..."
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
            </PageHeader>
            </div>

            <Tabs defaultValue="my-requests" className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
                <TabsList>
                    <TabsTrigger value="my-requests">Đơn của tôi</TabsTrigger>
                    {/* TODO: Check permission for Approval tab */}
                    <TabsTrigger value="approvals">Cần phê duyệt</TabsTrigger>
                </TabsList>

                <TabsContent value="my-requests" className="flex-1 overflow-hidden min-h-0 m-0">
                    <LeaveListTable type="MY_REQUESTS" search={search} sort={sort} onSort={setSort} />
                </TabsContent>
                <TabsContent value="approvals" className="flex-1 overflow-hidden min-h-0 m-0">
                    <LeaveListTable type="TO_APPROVE" search={search} sort={sort} onSort={setSort} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function LeaveListTable({
    type,
    search,
    sort,
    onSort
}: {
    type: "MY_REQUESTS" | "TO_APPROVE";
    search: string;
    sort: { sortBy: string, order: "asc" | "desc" };
    onSort: (val: any) => void;
}) {
    const { data, isLoading } = useLeaves({ type, limit: 10, search, sortBy: sort.sortBy, order: sort.order });
    const router = useRouter();
    const cancelLeave = useCancelLeave();
    const approveLeave = useApproveLeave();

    const toggleSort = (field: string) => {
        onSort((prev: any) => ({
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

    const handleCancel = async (id: string) => {
        try {
            await cancelLeave.mutateAsync(id);
            toast.success("Đã hủy đơn thành công");
        } catch {
            toast.error("Lỗi hủy đơn");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED": return <Badge className="bg-green-500">Đã duyệt</Badge>;
            case "REJECTED": return <Badge variant="destructive">Từ chối</Badge>;
            case "SUBMITTED": return <Badge className="bg-yellow-500">Chờ duyệt</Badge>;
            case "DRAFT": return <Badge variant="secondary">Nháp</Badge>;
            case "CANCELLED": return <Badge variant="outline">Đã hủy</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (isLoading) return <div className="text-center py-4">Đang tải...</div>;
    if (data?.data?.length === 0) return <div className="text-center py-8 text-muted-foreground border rounded-md">Không có dữ liệu.</div>;

    return (
        <>
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("leaveType.name")}>
                                <div className="flex items-center">
                                    Loại nghỉ <SortIcon field="leaveType.name" />
                                </div>
                            </TableHead>
                            {type === "TO_APPROVE" && (
                                <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("employee.fullName")}>
                                    <div className="flex items-center">
                                        Nhân viên <SortIcon field="employee.fullName" />
                                    </div>
                                </TableHead>
                            )}
                            <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("startDatetime")}>
                                <div className="flex items-center">
                                    Thời gian <SortIcon field="startDatetime" />
                                </div>
                            </TableHead>
                            <TableHead className="h-10 font-medium">Lý do</TableHead>
                            <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("status")}>
                                <div className="flex items-center">
                                    Trạng thái <SortIcon field="status" />
                                </div>
                            </TableHead>
                            <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => toggleSort("createdAt")}>
                                <div className="flex items-center">
                                    Ngày tạo <SortIcon field="createdAt" />
                                </div>
                            </TableHead>
                            <TableHead className="h-10 font-medium text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data?.data?.map((leave) => (
                            <TableRow key={leave.id}>
                                <TableCell className="font-medium">{leave.leaveType?.name}</TableCell>
                                {type === "TO_APPROVE" && (
                                    <TableCell>
                                        <div className="font-medium">{leave.employee?.fullName}</div>
                                        <div className="text-xs text-muted-foreground">{leave.employee?.employeeCode}</div>
                                    </TableCell>
                                )}
                                <TableCell>
                                    <div className="text-sm">
                                        {format(new Date(leave.startDatetime), "dd/MM/yyyy HH:mm")}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        đến {format(new Date(leave.endDatetime), "dd/MM/yyyy HH:mm")}
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate" title={leave.reason}>
                                    {leave.reason || "-"}
                                </TableCell>
                                <TableCell>{getStatusBadge(leave.status)}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {format(new Date(leave.createdAt), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {type === "MY_REQUESTS" && ["DRAFT", "SUBMITTED"].includes(leave.status) && (
                                                <DropdownMenuItem onClick={() => handleCancel(leave.id)} className="text-destructive">
                                                    Hủy đơn
                                                </DropdownMenuItem>
                                            )}

                                            {type === "TO_APPROVE" && leave.status === "SUBMITTED" && (
                                                <>
                                                    <DropdownMenuItem onClick={() => router.push(`/leaves/${leave.id}/approve?decision=APPROVED`)}>
                                                        <CalendarCheck className="mr-2 h-4 w-4 text-green-500" /> Duyệt
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => router.push(`/leaves/${leave.id}/approve?decision=REJECTED`)} className="text-destructive">
                                                        <CalendarX className="mr-2 h-4 w-4" /> Từ chối
                                                    </DropdownMenuItem>
                                                </>
                                            )}

                                            <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
