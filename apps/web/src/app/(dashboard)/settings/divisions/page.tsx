"use client";

import { getAvatarVariant } from "@/lib/utils";
import { useState, useMemo, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { useSortState } from "@/hooks/use-sort-state";
import { useDivisions, useDeleteDivision, Division, useUpdateDivision } from "@/services/division.service";
import { DivisionForm } from "@/components/divisions/division-form";
import { useRouter } from "next/navigation";
import { OrgModulePage, OrgColumnDef } from "@/components/organization/org-module-page";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MODULE_IDENTITIES } from "@/config/module-identities";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiPost, apiDelete } from "@/lib/api-client";
import { useExportDepartments, useBulkUpdateOrgChart } from "@/services/department.service";
import { ImportDepartmentDialog } from "@/components/departments/import-department-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

const getColumns = (
    onToggle: (id: string, checked: boolean) => void,
    onStatusToggle: (id: string, currentStatus: string) => void,
    isUpdatingStatus: string | null
): OrgColumnDef<Division>[] => [
    {
        key: "code",
        label: "Mã khối",
        sortable: true,
        className: "w-[120px]",
        render: (item) => (
            <span className="font-mono text-sm text-muted-foreground">{item.code}</span>
        ),
    },
    {
        key: "name",
        label: "Tên khối",
        sortable: true,
        render: (item) => (
            <span className="font-medium text-purple-600 dark:text-purple-400">{item.name}</span>
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
        label: "Giám đốc khối",
        sortable: false,
        render: (item) => (
            <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8 border border-border shadow-sm">
                    {item.manager?.avatar && <AvatarImage src={getAvatarVariant(item.manager.avatar, "thumb")} alt={item.manager.fullName} />}
                    <AvatarFallback className="bg-slate-100 text-slate-500">
                        <User className="h-4 w-4" />
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-none">
                        {item.manager?.fullName || <span className="text-muted-foreground/50 font-normal italic">Chưa cập nhật</span>}
                    </span>
                    {item.manager?.fullName && (
                        <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tight font-medium">
                            {item.manager?.jobTitle?.name || "Giám đốc khối"}
                        </span>
                    )}
                </div>
            </div>
        ),
    },
    {
        key: "factory",
        label: "Trực thuộc",
        sortable: true,
        render: (item) => (
            <span className="text-sm text-muted-foreground">
                {item.factory?.name || <span className="text-muted-foreground/50 italic">—</span>}
            </span>
        ),
    },
    {
        key: "employeeCount",
        label: "Nhân sự",
        className: "w-[100px] text-center",
        render: (item) => (
            item._count?.employees && item._count.employees > 0 ? (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-medium border border-purple-500/20 min-w-[2rem] shadow-sm">
                    {item._count.employees}
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

export default function DivisionListPage() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const { sortKey, sortDir, handleSort, resetSort } = useSortState("divisions", "code", "asc");

    const { data: divisionsData, isLoading, refetch } = useDivisions({
        page, limit: pageSize, search,
        sort: sortKey,
        order: sortDir,
    });

    const updateDivision = useUpdateDivision();
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

    const handleStatusToggle = useCallback(async (id: string, currentStatus: string) => {
        try {
            setUpdatingStatusId(id);
            const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await updateDivision.mutateAsync({ id, status: newStatus });
            toast.success(`Đã ${newStatus === "ACTIVE" ? "kích hoạt" : "vô hiệu hóa"} khối`);
            refetch();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Lỗi khi cập nhật trạng thái");
        } finally {
            setUpdatingStatusId(null);
        }
    }, [updateDivision, refetch]);

    const bulkUpdateOrgChart = useBulkUpdateOrgChart();
    const columns = useMemo(() => getColumns(
        async (id, checked) => { await updateDivision.mutateAsync({ id, showOnOrgChart: checked }); refetch(); },
        handleStatusToggle,
        updatingStatusId
    ), [updateDivision, handleStatusToggle, updatingStatusId, refetch]);

    const router = useRouter();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const deleteDivision = useDeleteDivision();
    const exportDepartments = useExportDepartments();
    const [isImportOpen, setIsImportOpen] = useState(false);

    const handleRefresh = () => { resetSort(); refetch(); };

    const handleExport = async () => {
        try {
            await exportDepartments.mutateAsync({ type: "DIVISION", search });
            toast.success("Xuất dữ liệu khối thành công!");
        } catch {
            toast.error("Lỗi xuất dữ liệu");
        }
    };

    const handleBulkToggle = async (showOnOrgChart: boolean) => {
        await bulkUpdateOrgChart.mutateAsync({ type: "DIVISION", showOnOrgChart });
    };

    return (
        <>
            <OrgModulePage<Division>
                config={{
                    title: MODULE_IDENTITIES.DIVISION.label,
                    icon: MODULE_IDENTITIES.DIVISION.icon,
                    solidBg: MODULE_IDENTITIES.DIVISION.solidBg,
                    titleGradient: MODULE_IDENTITIES.DIVISION.titleGradient,
                    accentBorderClass: MODULE_IDENTITIES.DIVISION.borderClass,
                    accentBgClass: MODULE_IDENTITIES.DIVISION.bgColor,
                    accentTextClass: MODULE_IDENTITIES.DIVISION.color,
                    permissionPrefix: "DIVISION",
                    moduleKey: "divisions",
                    columns,
                    getId: (d) => d.id,
                    getName: (d) => d.name,
                    getStatus: (d) => d.status as "ACTIVE" | "INACTIVE",
                    getEmployeeCount: (d) => d._count?.employees ?? 0,
                    getAuditInfo: (d) => ({
                        createdBy: d.createdBy?.username,
                        createdAt: d.createdAt,
                        updatedBy: d.updatedBy?.username,
                        updatedAt: d.updatedAt,
                    }),
                    clickableKeys: ["code", "name"],
                    singularLabel: "khối",
                    searchPlaceholder: "Tìm kiếm theo mã, tên khối...",
                    backHref: "/settings",
                }}
                data={divisionsData?.data || []}
                meta={divisionsData?.meta}
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
                onDelete={(id) => deleteDivision.mutateAsync(id) as Promise<void>}
                onCreateClick={() =>  { setSelectedId(null); setIsFormOpen(true); }}
                onEditClick={(item) =>  { setSelectedId(item.id); setIsFormOpen(true); }}
                onExport={handleExport}
                isExporting={exportDepartments.isPending}
                onImport={() => setIsImportOpen(true)}
                onBulkToggleOrgChart={handleBulkToggle}
                onToggleOrgChart={async (id, checked) => {
                    await updateDivision.mutateAsync({ id, showOnOrgChart: checked });
                }}
                isTogglingOrgChart={bulkUpdateOrgChart.isPending}
                dialogs={
                    <>
                        <DivisionForm 
                            variant="drawer"
                            open={isFormOpen}
                            onOpenChange={setIsFormOpen}
                            divisionId={selectedId}
                            onSuccess={refetch}
                        />
                        <ImportDepartmentDialog
                        open={isImportOpen}
                        onOpenChange={setIsImportOpen}
                        onSuccess={refetch}
                        type="DIVISION"
                        />
                    </>
                }
            />
        </>
    );
}
