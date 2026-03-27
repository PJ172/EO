"use client";

import { useState, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { useSortState } from "@/hooks/use-sort-state";
import {
    useCategories, useDeleteCategory, useUpdateCategory, useBulkDeleteCategories, Category,
} from "@/services/category.service";
import { OrgModulePage, OrgColumnDef } from "@/components/organization/org-module-page";
import { FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CategoryForm } from "@/components/categories/category-form";

const getColumns = (
    onStatusToggle: (id: string, currentStatus: string) => void,
    isUpdatingStatus: string | null
): OrgColumnDef<Category>[] => [
    {
        key: "code",
        label: "Mã danh mục",
        sortable: true,
        className: "w-[120px]",
        render: (item) => (
            <span className="font-mono text-sm font-semibold text-teal-600 dark:text-teal-400 tracking-wider">{item.code}</span>
        ),
    },
    {
        key: "name",
        label: "Tên danh mục",
        sortable: true,
        render: (item) => (
            <span className="font-medium text-foreground">{item.name}</span>
        ),
    },
    {
        key: "type",
        label: "Loại",
        sortable: false,
        className: "w-[150px]",
        render: (item) => (
            item.type ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    {item.type}
                </span>
            ) : (
                <span className="text-muted-foreground/50 italic text-sm">—</span>
            )
        ),
    },
    {
        key: "status",
        label: "Trạng thái",
        sortable: true,
        className: "w-[140px]",
        render: (item) => (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Switch
                    checked={item.status === "ACTIVE"}
                    disabled={isUpdatingStatus === item.id}
                    onCheckedChange={() => onStatusToggle(item.id, item.status)}
                    className="data-[state=checked]:bg-emerald-500 scale-90"
                />
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${item.status === "ACTIVE" ? "text-emerald-600" : "text-slate-400"}`}>
                    {item.status === "ACTIVE" ? "Hoạt động" : "Ngừng"}
                </span>
            </div>
        ),
    },
    {
        key: "createdAt",
        label: "Ngày tạo",
        sortable: true,
        className: "whitespace-nowrap w-[140px]",
        render: (item) => (
            <span className="text-sm text-muted-foreground/80">
                {item.createdAt ? format(new Date(item.createdAt), "dd/MM/yyyy HH:mm") : ""}
            </span>
        ),
    },
    {
        key: "createdBy",
        label: "Người tạo",
        sortable: false,
        className: "w-[120px]",
        render: (item) => (
            <span className="text-sm text-muted-foreground">{item.createdBy?.username || "—"}</span>
        ),
    },
];

export default function CategoriesPage() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const { sortKey, sortDir, handleSort, resetSort } = useSortState("categories", "createdAt", "desc");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

    const updateCategory = useUpdateCategory();
    const deleteCategory = useDeleteCategory();
    const bulkDeleteCategories = useBulkDeleteCategories();

    const { data: categoriesData, isLoading, refetch } = useCategories({
        page, limit: pageSize, search, sortBy: sortKey, order: sortDir,
    });

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        try {
            setUpdatingStatusId(id);
            const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await updateCategory.mutateAsync({ id, status: newStatus });
            toast.success(`Đã ${newStatus === "ACTIVE" ? "kích hoạt" : "vô hiệu hóa"} danh mục`);
            refetch();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Lỗi cập nhật trạng thái");
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const columns = useMemo(() => getColumns(handleStatusToggle, updatingStatusId), [updatingStatusId]);
    const handleRefresh = () => { resetSort(); refetch(); };

    return (
        <>
            <OrgModulePage<Category>
                config={{
                    title: "DANH MỤC CNTT",
                    icon: FolderOpen,
                    solidBg: "bg-gradient-to-br from-teal-500 to-cyan-600",
                    titleGradient: "from-teal-600 to-cyan-700",
                    accentBorderClass: "border-teal-200 dark:border-teal-800",
                    accentBgClass: "bg-teal-500/10",
                    accentTextClass: "text-teal-600 dark:text-teal-400",
                    permissionPrefix: "SETTINGS",
                    moduleKey: "categories",
                    columns,
                    getId: (d) => d.id,
                    getName: (d) => d.name,
                    getStatus: (d) => d.status as "ACTIVE" | "INACTIVE",
                    getAuditInfo: (d) => ({
                        createdBy: d.createdBy?.username,
                        createdAt: d.createdAt,
                        updatedBy: d.updatedBy?.username,
                        updatedAt: d.updatedAt,
                    }),
                    clickableKeys: ["code", "name"],
                    singularLabel: "danh mục",
                    searchPlaceholder: "Tìm kiếm theo mã, tên danh mục...",
                    backHref: "/settings",
                }}
                data={categoriesData?.data || []}
                meta={categoriesData?.meta}
                isLoading={isLoading}
                refetch={refetch}
                onRefreshWithReset={handleRefresh}
                page={page}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                search={search}
                onSearchChange={setSearch}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                onDelete={async (id) => { await deleteCategory.mutateAsync(id); }}
                onBulkDelete={async (ids) => {
                    const results = await bulkDeleteCategories.mutateAsync(ids);
                    if (results.success > 0) toast.success(`Đã xóa ${results.success} danh mục`);
                    if (results.failed > 0) toast.error(`Có ${results.failed} lỗi xóa`);
                }}
                onCreateClick={() => { setSelectedId(null); setIsFormOpen(true); }}
                onEditClick={(item) => { setSelectedId(item.id); setIsFormOpen(true); }}
                dialogs={
                    <CategoryForm
                        categoryId={selectedId}
                        open={isFormOpen}
                        onOpenChange={setIsFormOpen}
                        onSuccess={refetch}
                    />
                }
            />
        </>
    );
}
