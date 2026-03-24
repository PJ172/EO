"use client";

import { useState } from "react";
import { AuditTable } from "@/components/audit/audit-table";
import { AuditFilter } from "@/components/audit/audit-filter";
import { useAuditLogs, useExportAuditLogs, AuditLogParams } from "@/services/audit.service";
import { Button } from "@/components/ui/button";
import { FileDown, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchBar } from "@/components/ui/search-bar";
import { PaginationControl } from "@/components/ui/pagination-control";
import { toast } from "sonner";

export default function AuditLogsPage() {
    const [params, setParams] = useState<AuditLogParams>({
        page: 1,
        limit: 20,
    });

    const { data, isLoading, refetch } = useAuditLogs(params);
    const exportMutation = useExportAuditLogs();

    const handleFilterChange = (newFilters: AuditLogParams) => {
        setParams((prev) => ({ ...prev, ...newFilters, page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        setParams((prev) => ({ ...prev, page: newPage }));
    };

    const handleExport = async () => {
        try {
            const { page, limit, ...exportParams } = params;
            await exportMutation.mutateAsync(exportParams);
            toast.success("Xuất nhật ký thành công!");
        } catch {
            toast.error("Lỗi khi xuất Excel nhật ký");
        }
    };

    const toggleSort = (field: string) => {
        setParams(prev => ({
            ...prev,
            sortBy: field,
            order: prev.sortBy === field && prev.order === "asc" ? "desc" : "asc",
            page: 1
        }));
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (params.sortBy !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50 text-muted-foreground group-hover:opacity-100 transition-opacity" />;
        return params.order === "asc" ? <ChevronUp className="ml-2 h-4 w-4 text-primary" /> : <ChevronDown className="ml-2 h-4 w-4 text-primary" />;
    };

    return (
        <div className="space-y-6">
            <PageHeader
                backHref="/settings"
                title="Nhật ký hoạt động"
                description="Theo dõi và truy vết lịch sử thay đổi của hệ thống"
                onRefresh={refetch}
                isRefreshing={isLoading}
                refreshLabel="Làm mới"
                icon={
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-sm">
                        <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                }
                search={
                    <div className="relative group">
                        <SearchBar
                            placeholder="Tìm kiếm hành động..."
                            value={params.search || ""}
                            onChange={(e) => handleFilterChange({ search: e.target.value } as any)}
                        />
                    </div>
                }
            >
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        disabled={exportMutation.isPending}
                        className="h-9 bg-white/80 backdrop-blur-sm border-border/50 hover:bg-slate-100 transition-all rounded-xl shadow-sm font-semibold gap-2"
                    >
                        <FileDown className="h-4 w-4 text-muted-foreground" />
                        <span>{exportMutation.isPending ? "Đang xuất..." : "Xuất Excel"}</span>
                    </Button>
                </div>
            </PageHeader>

            <AuditFilter onFilterChange={handleFilterChange} />

            <AuditTable
                data={data?.data || []}
                isLoading={isLoading}
                sort={{ sortBy: params.sortBy || "createdAt", order: params.order || "desc" }}
                onSort={toggleSort}
            />

            <PaginationControl
                currentPage={params.page || 1}
                totalPages={data?.meta.totalPages || 1}
                pageSize={params.limit || 20}
                totalCount={data?.meta.total || 0}
                onPageChange={handlePageChange}
                onPageSizeChange={(newSize) => setParams(prev => ({ ...prev, limit: newSize, page: 1 }))}
            />
        </div>
    );
}
