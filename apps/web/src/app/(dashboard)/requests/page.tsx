"use client";
import React from "react";

import { useQuery } from "@tanstack/react-query";
import { requestApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Loader2, Clock, CheckCircle, Search, FileDown, Upload, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { SearchBar } from "@/components/ui/search-bar";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    DRAFT: { label: "Nháp", variant: "secondary" },
    SUBMITTED: { label: "Chờ duyệt", variant: "outline" },
    IN_PROGRESS: { label: "Đang xử lý", variant: "default" },
    APPROVED: { label: "Đã duyệt", variant: "default" },
    REJECTED: { label: "Từ chối", variant: "destructive" },
    CANCELLED: { label: "Đã hủy", variant: "secondary" },
};

const TYPE_MAP: Record<string, string> = {
    PAYMENT: "Thanh toán",
    PURCHASE: "Mua sắm",
    PROPOSAL: "Đề xuất",
    GENERAL: "Chung",
    GENERIC: "Chung",
    LEAVE: "Nghỉ phép",
};

function RequestTable({
    requests,
    isLoading,
    emptyMessage,
    sort,
    onSort,
    SortIcon
}: {
    requests: any[] | undefined;
    isLoading: boolean;
    emptyMessage: string;
    sort: { sortBy: string, order: "asc" | "desc" };
    onSort: (field: string) => void;
    SortIcon: ({ field }: { field: string }) => React.ReactNode;
}) {
    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Table>
            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => onSort("code")}>
                        <div className="flex items-center">
                            Mã <SortIcon field="code" />
                        </div>
                    </TableHead>
                    <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => onSort("title")}>
                        <div className="flex items-center">
                            Tiêu đề <SortIcon field="title" />
                        </div>
                    </TableHead>
                    <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => onSort("type")}>
                        <div className="flex items-center">
                            Loại <SortIcon field="type" />
                        </div>
                    </TableHead>
                    <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => onSort("status")}>
                        <div className="flex items-center">
                            Trạng thái <SortIcon field="status" />
                        </div>
                    </TableHead>
                    <TableHead className="h-10 font-medium cursor-pointer hover:bg-muted/80 transition-colors group" onClick={() => onSort("createdAt")}>
                        <div className="flex items-center">
                            Ngày tạo <SortIcon field="createdAt" />
                        </div>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {requests?.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {emptyMessage}
                        </TableCell>
                    </TableRow>
                ) : (
                    requests?.map((req: any) => {
                        const statusInfo = STATUS_MAP[req.status] || { label: req.status, variant: "secondary" };
                        const typeLabel = TYPE_MAP[req.type] || req.type;
                        return (
                            <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50">
                                <TableCell className="font-medium">
                                    <Link href={`/requests/${req.id}`} className="hover:underline">
                                        {req.code}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    <Link href={`/requests/${req.id}`} className="flex items-center hover:underline">
                                        <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                                        {req.title}
                                    </Link>
                                </TableCell>
                                <TableCell>{typeLabel}</TableCell>
                                <TableCell>
                                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                                </TableCell>
                                <TableCell>
                                    {format(new Date(req.createdAt), "dd/MM/yyyy", { locale: vi })}
                                </TableCell>
                            </TableRow>
                        );
                    })
                )}
            </TableBody>
        </Table>
    );
}

export default function RequestsPage() {
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<{ sortBy: string, order: "asc" | "desc" }>({ sortBy: "createdAt", order: "desc" });

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
    const { data: myRequests, isLoading: myLoading, refetch: refetchMy } = useQuery({
        queryKey: ["requests", "mine"],
        queryFn: requestApi.getAll,
    });

    const { data: allPendingRequests, isLoading: isLoadingPending } = useQuery({
        queryKey: ["requests", "pending"],
        queryFn: requestApi.getPending,
    });

    const displayMyRequests = myRequests?.filter((r: any) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.code.toLowerCase().includes(search.toLowerCase())
    ).sort((a: any, b: any) => {
        const aVal = a[sort.sortBy];
        const bVal = b[sort.sortBy];
        if (sort.order === "asc") return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
    });

    const pendingRequests = allPendingRequests?.filter((r: any) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.code.toLowerCase().includes(search.toLowerCase())
    ).sort((a: any, b: any) => {
        const aVal = a[sort.sortBy];
        const bVal = b[sort.sortBy];
        if (sort.order === "asc") return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
    });

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background">
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
            <PageHeader
                title="Yêu cầu & Đề xuất"
                icon={
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-amber-500 to-amber-700">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                    </div>
                }
                className="mb-0 border-none bg-transparent p-0 shadow-none"
                onRefresh={refetchMy}
                isRefreshing={myLoading}
                search={
                    <SearchBar
                        placeholder="Tìm kiếm yêu cầu..."
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
                <Button asChild className="h-10">
                    <Link href="/requests/new">
                        <Plus className="mr-2 h-4 w-4" /> Thêm mới
                    </Link>
                </Button>
            </PageHeader>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 custom-scrollbar pr-1 pb-2">
            <Tabs defaultValue="mine" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="mine" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Tờ trình của tôi
                        {myRequests && myRequests.length > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {myRequests.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Cần duyệt
                        {pendingRequests && pendingRequests.length > 0 && (
                            <Badge variant="destructive" className="ml-1">
                                {pendingRequests.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="mine">
                    <div className="rounded-md border bg-card">
                        <RequestTable
                            requests={displayMyRequests}
                            isLoading={myLoading}
                            emptyMessage="Chưa có tờ trình nào."
                            sort={sort}
                            onSort={toggleSort}
                            SortIcon={SortIcon}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="pending">
                    <div className="rounded-md border bg-card">
                        <RequestTable
                            requests={pendingRequests}
                            isLoading={isLoadingPending}
                            emptyMessage="Không có tờ trình nào cần duyệt."
                            sort={sort}
                            onSort={toggleSort}
                            SortIcon={SortIcon}
                        />
                    </div>
                </TabsContent>
            </Tabs>
            </div>
        </div>
    );
}
