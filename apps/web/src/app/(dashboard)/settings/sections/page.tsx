"use client";

import { useState, useMemo, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { useSortState } from "@/hooks/use-sort-state";
import { useSections, useDeleteSection, Section, useUpdateSection } from "@/services/section.service";
import { SectionForm } from "@/components/sections/section-form";
import { useRouter } from "next/navigation";
import { OrgModulePage, OrgColumnDef } from "@/components/organization/org-module-page";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MODULE_IDENTITIES } from "@/config/module-identities";
import { apiPost, apiDelete } from "@/lib/api-client";
import { useExportDepartments, useBulkUpdateOrgChart } from "@/services/department.service";
import { ImportDepartmentDialog } from "@/components/departments/import-department-dialog";

const getColumns = (
    onToggle: (id: string, checked: boolean) => void,
    onDisplayTitleToggle: (id: string, checked: boolean) => void,
    onStatusToggle: (id: string, currentStatus: string) => void,
    isUpdatingStatus: string | null
): OrgColumnDef<Section>[] => [
    {
        key: "code",
        label: "Mã bộ phận",
        sortable: true,
        className: "w-[120px]",
        render: (item) => (
            <span className="font-mono text-sm text-muted-foreground">{item.code}</span>
        ),
    },
    {
        key: "name",
        label: "Tên bộ phận",
        sortable: true,
        render: (item) => (
            <span className="font-medium text-teal-600 dark:text-teal-400">{item.name}</span>
        ),
    },
    {
        key: "department",
        label: "Trực thuộc",
        sortable: true,
        render: (item) => (
            <span className="text-sm text-muted-foreground">
                {item.department?.name || <span className="text-muted-foreground/50 italic">—</span>}
            </span>
        ),
    },
    {
        key: "manager",
        label: "Quản lý bộ phận",
        sortable: false,
        render: (item) => (
            <span className="text-sm font-medium text-foreground">
                {item.manager?.fullName || <span className="text-muted-foreground/40 font-normal">-</span>}
            </span>
        ),
    },
    {
        key: "employeeCount",
        label: "Nhân sự",
        className: "w-[100px] text-center",
        render: (item) => (
            item._count?.employees && item._count.employees > 0 ? (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 text-xs font-medium border border-teal-500/20 min-w-[2rem] shadow-sm">
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
        key: "useManagerDisplayTitle",
        label: "C. danh Tùy chỉnh",
        sortable: false,
        className: "w-[120px] text-center",
        render: (item) => (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <Switch
                    checked={!!(item as any).useManagerDisplayTitle}
                    className="data-[state=checked]:bg-orange-500 scale-90"
                    onCheckedChange={(checked) => onDisplayTitleToggle(item.id, checked)}
                />
            </div>
        ),
    },
    {
        key: "managerDisplayTitle",
        label: "Chức danh Sơ đồ",
        sortable: false,
        className: "w-[180px]",
        render: (item) => (
            (item as any).useManagerDisplayTitle && (item as any).managerDisplayTitle ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-xs font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                    {(item as any).managerDisplayTitle}
                </span>
            ) : (
                <span className="text-muted-foreground/40 text-xs italic">—</span>
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

export default function SectionListPage() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const { sortKey, sortDir, handleSort, resetSort } = useSortState("sections", "code", "asc");

    const updateSection = useUpdateSection();
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

    const { data: sectionsData, isLoading, refetch } = useSections({
        page, limit: pageSize, search,
        sort: sortKey,
        order: sortDir,
    });

    const handleStatusToggle = useCallback(async (id: string, currentStatus: string) => {
        try {
            setUpdatingStatusId(id);
            const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await updateSection.mutateAsync({ id, status: newStatus });
            toast.success(`Đã ${newStatus === "ACTIVE" ? "kích hoạt" : "vô hiệu hóa"} bộ phận`);
            refetch();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Lỗi khi cập nhật trạng thái");
        } finally {
            setUpdatingStatusId(null);
        }
    }, [updateSection, refetch]);

    const bulkUpdateOrgChart = useBulkUpdateOrgChart();
    const columns = useMemo(() => getColumns(
        async (id, checked) => { await updateSection.mutateAsync({ id, showOnOrgChart: checked }); refetch(); },
        async (id, checked) => { await updateSection.mutateAsync({ id, useManagerDisplayTitle: checked }); refetch(); },
        handleStatusToggle,
        updatingStatusId
    ), [updateSection, handleStatusToggle, updatingStatusId, refetch]);
    const router = useRouter();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const deleteSection = useDeleteSection();
    const exportDepartments = useExportDepartments();
    const [isImportOpen, setIsImportOpen] = useState(false);

    const handleRefresh = () => { resetSort(); refetch(); };

    const handleExport = async () => {
        try {
            await exportDepartments.mutateAsync({ type: "SECTION", search });
            toast.success("Xuất dữ liệu bộ phận thành công!");
        } catch {
            toast.error("Lỗi xuất dữ liệu");
        }
    };

    const handleBulkToggle = async (showOnOrgChart: boolean) => {
        await bulkUpdateOrgChart.mutateAsync({ type: "SECTION", showOnOrgChart });
    };

    return (
        <>
            <OrgModulePage<Section>
                config={{
                    title: MODULE_IDENTITIES.SECTION.label,
                    icon: MODULE_IDENTITIES.SECTION.icon,
                    solidBg: MODULE_IDENTITIES.SECTION.solidBg,
                    titleGradient: MODULE_IDENTITIES.SECTION.titleGradient,
                    accentBorderClass: MODULE_IDENTITIES.SECTION.borderClass,
                    accentBgClass: MODULE_IDENTITIES.SECTION.bgColor,
                    accentTextClass: MODULE_IDENTITIES.SECTION.color,
                    permissionPrefix: "SECTION",
                    moduleKey: "sections",
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
                    singularLabel: "bộ phận",
                    searchPlaceholder: "Tìm kiếm theo mã, tên bộ phận...",
                    backHref: "/settings",
                }}
                data={sectionsData?.data || []}
                meta={sectionsData?.meta}
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
                onDelete={(id) => deleteSection.mutateAsync(id) as Promise<void>}
                onCreateClick={() =>  { setSelectedId(null); setIsFormOpen(true); }}
                onEditClick={(item) =>  { setSelectedId(item.id); setIsFormOpen(true); }}
                onExport={handleExport}
                isExporting={exportDepartments.isPending}
                onImport={() => setIsImportOpen(true)}
                onBulkToggleOrgChart={handleBulkToggle}
                onToggleOrgChart={async (id, checked) => {
                    await updateSection.mutateAsync({ id, showOnOrgChart: checked });
                }}
                isTogglingOrgChart={bulkUpdateOrgChart.isPending}
                dialogs={
                    <>
                        <SectionForm 
                            variant="drawer"
                            open={isFormOpen}
                            onOpenChange={setIsFormOpen}
                            sectionId={selectedId}
                            onSuccess={refetch}
                        />
                        <ImportDepartmentDialog
                        open={isImportOpen}
                        onOpenChange={setIsImportOpen}
                        onSuccess={refetch}
                        type="SECTION"
                        />
                    </>
                }
            />
        </>
    );
}
