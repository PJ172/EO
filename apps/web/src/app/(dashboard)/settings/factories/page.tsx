"use client";

import { getAvatarVariant } from "@/lib/utils";
import { useState, useMemo, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { useSortState } from "@/hooks/use-sort-state";
import { useFactories, useDeleteFactory, useExportFactories, Factory, useUpdateFactory } from "@/services/factory.service";
import { useBulkUpdateOrgChart } from "@/services/department.service";
import { FactoryForm } from "@/components/factories/factory-form";
import { useRouter } from "next/navigation";
import { ImportFactoryDialog } from "@/components/factories/import-factory-dialog";
import { OrgModulePage, OrgColumnDef } from "@/components/organization/org-module-page";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MODULE_IDENTITIES } from "@/config/module-identities";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

const getColumns = (
    onToggle: (id: string, checked: boolean) => void,
    onToggleExclude: (id: string, checked: boolean) => void,
    onStatusToggle: (id: string, currentStatus: string) => void,
    isUpdatingStatus: string | null
): OrgColumnDef<Factory>[] => [
    {
        key: "code",
        label: "Mã nhà máy",
        sortable: true,
        className: "w-[100px]",
        render: (item) => (
            <span className="font-mono text-sm text-muted-foreground">{item.code}</span>
        ),
    },
    {
        key: "name",
        label: "Tên nhà máy",
        sortable: true,
        render: (item) => (
            <span className="font-medium text-blue-600 dark:text-blue-500">{item.name}</span>
        ),
    },
    {
        key: "managerEmployeeCode",
        label: "Mã NV",
        sortable: false,
        className: "w-[90px]",
        render: (item) => (
            <span className="font-mono text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                {item.manager?.employeeCode || <span className="text-muted-foreground/30">—</span>}
            </span>
        ),
    },
    {
        key: "manager",
        label: "Người điều hành",
        sortable: false,
        render: (item) => (
            <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8 border border-border shadow-sm">
                    {item.manager?.avatar && <AvatarImage src={getAvatarVariant(item.manager.avatar, "thumb")} alt={item.manager.fullName} />}
                    <AvatarFallback className="bg-slate-100 text-slate-500">
                        <User className="h-4 w-4" />
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                        {item.manager?.fullName || <span className="text-muted-foreground/50 font-normal italic">Chưa cập nhật</span>}
                    </span>
                    {item.manager?.fullName && (
                        <span className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                            {item.manager?.jobTitle?.name || "Giám đốc nhà máy"}
                        </span>
                    )}
                </div>
            </div>
        ),
    },
    {
        key: "company",
        label: "Trực thuộc",
        sortable: true,
        render: (item) => (
            <span className="text-sm text-muted-foreground">
                {item.company?.name || <span className="text-muted-foreground/50 italic">—</span>}
            </span>
        ),
    },
    {
        key: "address",
        label: "Địa chỉ",
        sortable: false,
        render: (item) => (
            <span className="text-sm text-muted-foreground">{item.address || <span className="text-muted-foreground/50 italic">—</span>}</span>
        ),
    },
    {
        key: "employeeCount",
        label: "Nhân sự",
        className: "w-[100px] text-center",
        render: (item) => (
            (item as any)._count?.employees && (item as any)._count.employees > 0 ? (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-medium border border-indigo-500/20 min-w-[2rem] shadow-sm">
                    {(item as any)._count.employees}
                </span>
            ) : (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border min-w-[2rem]">
                    0
                </span>
            )
        ),
    },
    {
        key: "showOnOrgChart",
        label: "Sơ đồ",
        className: "w-[80px] text-center",
        render: (item) => (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <Switch
                    checked={(item as any).showOnOrgChart}
                    className="data-[state=checked]:bg-emerald-500 scale-90"
                    onCheckedChange={(checked) => onToggle(item.id, checked)}
                />
            </div>
        ),
    },
    {
        key: "excludeFromFilters",
        label: "Ẩn khỏi lọc",
        className: "w-[100px] text-center",
        render: (item) => (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <Switch
                    checked={(item as any).excludeFromFilters || false}
                    className="data-[state=checked]:bg-rose-500 scale-90"
                    onCheckedChange={(checked) => onToggleExclude(item.id, checked)}
                />
            </div>
        ),
    },
    {
        key: "status",
        label: "Trạng thái",
        sortable: true,
        className: "w-[130px]",
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
];

export default function FactoriesPage() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const { sortKey, sortDir, handleSort, resetSort } = useSortState("factories", "code", "asc");

    const updateFactory = useUpdateFactory();
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

    const { data: factoriesData, isLoading, refetch } = useFactories({
        page, limit: pageSize, search,
        sort: sortKey,
        order: sortDir,
    });

    const handleStatusToggle = useCallback(async (id: string, currentStatus: string) => {
        try {
            setUpdatingStatusId(id);
            const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await updateFactory.mutateAsync({ id, status: newStatus });
            toast.success(`Đã ${newStatus === "ACTIVE" ? "kích hoạt" : "vô hiệu hóa"} nhà máy`);
            refetch();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Lỗi khi cập nhật trạng thái");
        } finally {
            setUpdatingStatusId(null);
        }
    }, [updateFactory, refetch]);

    const bulkUpdateOrgChart = useBulkUpdateOrgChart();
    const columns = useMemo(() => getColumns(
        async (id, checked) => { await updateFactory.mutateAsync({ id, showOnOrgChart: checked }); refetch(); },
        async (id, checked) => { await updateFactory.mutateAsync({ id, excludeFromFilters: checked } as any); refetch(); },
        handleStatusToggle,
        updatingStatusId
    ), [updateFactory, handleStatusToggle, updatingStatusId, refetch]);
    const router = useRouter();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [openImport, setOpenImport] = useState(false);

    const deleteFactory = useDeleteFactory();
    const exportFactories = useExportFactories();
    const handleRefresh = () => { resetSort(); refetch(); };

    const handleBulkToggle = async (showOnOrgChart: boolean) => {
        await bulkUpdateOrgChart.mutateAsync({ type: "FACTORY", showOnOrgChart });
    };

    return (
        <>
            <OrgModulePage<Factory>
                config={{
                    title: MODULE_IDENTITIES.FACTORY.label,
                    icon: MODULE_IDENTITIES.FACTORY.icon,
                    solidBg: MODULE_IDENTITIES.FACTORY.solidBg,
                    titleGradient: MODULE_IDENTITIES.FACTORY.titleGradient,
                    accentBorderClass: MODULE_IDENTITIES.FACTORY.borderClass,
                    accentBgClass: MODULE_IDENTITIES.FACTORY.bgColor,
                    accentTextClass: MODULE_IDENTITIES.FACTORY.color,
                    permissionPrefix: "FACTORY",
                    moduleKey: "factories",
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
                    singularLabel: "nhà máy",
                    searchPlaceholder: "Tìm kiếm theo mã, tên nhà máy...",
                    backHref: "/settings",
                }}
                data={factoriesData?.data || []}
                meta={factoriesData?.meta}
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
                onDelete={(id) => deleteFactory.mutateAsync(id) as unknown as Promise<void>}
                onExport={async () => {
                    try { await exportFactories.mutateAsync({ search }); toast.success("Xuất dữ liệu thành công!"); }
                    catch { toast.error("Lỗi xuất dữ liệu"); }
                }}
                isExporting={exportFactories.isPending}
                onImport={() => setOpenImport(true)}
                onCreateClick={() =>  { setSelectedId(null); setIsFormOpen(true); }}
                onEditClick={(item) =>  { setSelectedId(item.id); setIsFormOpen(true); }}
                onBulkToggleOrgChart={handleBulkToggle}
                onToggleOrgChart={async (id, checked) => {
                    await updateFactory.mutateAsync({ id, showOnOrgChart: checked });
                }}
                isTogglingOrgChart={bulkUpdateOrgChart.isPending}
                dialogs={
                    <>
                        <FactoryForm 
                            variant="drawer"
                            open={isFormOpen}
                            onOpenChange={setIsFormOpen}
                            factoryId={selectedId}
                            onSuccess={refetch}
                        />
                        <ImportFactoryDialog
                            open={openImport}
                            onOpenChange={setOpenImport}
                            onSuccess={refetch}
                        />
                    </>
                }
            />
        </>
    );
}
