"use client";

import { useState, useMemo, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { useSortState } from "@/hooks/use-sort-state";
import { useDepartments, useDeleteDepartment, useExportDepartments, useUpdateDepartment, useBulkUpdateOrgChart } from "@/services/department.service";
import { DepartmentForm } from "@/components/departments/department-form";
import { useRouter } from "next/navigation";
import { ImportDepartmentDialog } from "@/components/departments/import-department-dialog";
import { OrgModulePage, OrgColumnDef } from "@/components/organization/org-module-page";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { MODULE_IDENTITIES } from "@/config/module-identities";
import { apiPost, apiDelete } from "@/lib/api-client";

interface Department {
    id: string;
    code: string;
    name: string;
    status: string;
    parent?: { name: string } | null;
    division?: { name: string } | null;
    manager?: { fullName: string; employeeCode: string } | null;
    _count?: { employees: number };
    createdAt?: string;
    updatedAt?: string;
    createdBy?: { username: string } | null;
    updatedBy?: { username: string } | null;
    deletedAt?: string | null;
    deletedBy?: { username: string; fullName?: string } | null;
    useManagerDisplayTitle?: boolean;
    managerDisplayTitle?: string | null;
}

const getColumns = (
    onToggle: (id: string, checked: boolean) => void,
    onDisplayTitleToggle: (id: string, checked: boolean) => void,
    onStatusToggle: (id: string, currentStatus: string) => void,
    isUpdatingStatus: string | null
): OrgColumnDef<Department>[] => [
    {
        key: "code",
        label: "Mã phòng ban",
        sortable: true,
        className: "w-[120px]",
        render: (item) => (
            <span className="font-mono text-sm text-muted-foreground">{item.code}</span>
        ),
    },
    {
        key: "name",
        label: "Tên phòng ban",
        sortable: true,
        render: (item) => (
            <span className="font-medium text-blue-600 dark:text-blue-500">{item.name}</span>
        ),
    },
    {
        key: "parent",
        label: "Trực thuộc",
        sortable: false,
        render: (item) => (
            <span className="text-sm text-muted-foreground">
                {item.parent?.name || item.division?.name || <span className="italic text-muted-foreground/50">Cấp cao nhất</span>}
            </span>
        ),
    },
    {
        key: "managerCode",
        label: "Mã nhân viên",
        sortable: false,
        render: (item) => (
            <span className="font-mono text-sm text-muted-foreground">
                {item.manager?.employeeCode || <span className="text-muted-foreground/40">-</span>}
            </span>
        ),
    },
    {
        key: "manager",
        label: "Quản lý phòng",
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
        sortable: true,
        className: "text-center",
        render: (item) => (
            item._count?.employees && item._count.employees > 0
                ? <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-500/20 min-w-[2rem] shadow-sm">{item._count.employees}</span>
                : <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border min-w-[2rem]">0</span>
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
                    checked={!!item.useManagerDisplayTitle}
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
            item.useManagerDisplayTitle && item.managerDisplayTitle ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-xs font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                    {item.managerDisplayTitle}
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
    {
        key: "createdBy",
        label: "Người tạo",
        sortable: true,
        render: (item) => <span className="text-sm text-muted-foreground/80">{item.createdBy?.username || "-"}</span>,
    },
    {
        key: "createdAt",
        label: "Ngày tạo",
        sortable: true,
        className: "whitespace-nowrap",
        render: (item) => (
            <span className="text-sm text-muted-foreground/80">
                {item.createdAt ? format(new Date(item.createdAt), "dd/MM/yyyy HH:mm") : ""}
            </span>
        ),
    },
    {
        key: "updatedBy",
        label: "Người sửa",
        sortable: true,
        render: (item) => <span className="text-sm text-muted-foreground/80">{item.updatedBy?.username || "-"}</span>,
    },
    {
        key: "updatedAt",
        label: "Ngày sửa",
        sortable: true,
        className: "whitespace-nowrap",
        render: (item) => (
            <span className="text-sm text-muted-foreground/80">
                {item.updatedAt ? format(new Date(item.updatedAt), "dd/MM/yyyy HH:mm") : ""}
            </span>
        ),
    },
];

export default function DepartmentListPage() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const { sortKey, sortDir, handleSort, resetSort } = useSortState("departments", "code", "asc");

    const updateDepartment = useUpdateDepartment();
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

    const { data: departmentsData, isLoading, refetch } = useDepartments({
        page, limit: pageSize, search,
        sort: sortKey,
        order: sortDir,
    });

    const handleStatusToggle = useCallback(async (id: string, currentStatus: string) => {
        try {
            setUpdatingStatusId(id);
            const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await updateDepartment.mutateAsync({ id, status: newStatus });
            toast.success(`Đã ${newStatus === "ACTIVE" ? "kích hoạt" : "vô hiệu hóa"} phòng ban`);
            refetch();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Lỗi khi cập nhật trạng thái");
        } finally {
            setUpdatingStatusId(null);
        }
    }, [updateDepartment, refetch]);

    const bulkUpdateOrgChart = useBulkUpdateOrgChart();
    const columns = useMemo(() => getColumns(
        async (id, checked) => { await updateDepartment.mutateAsync({ id, showOnOrgChart: checked }); refetch(); },
        async (id, checked) => { await updateDepartment.mutateAsync({ id, useManagerDisplayTitle: checked }); refetch(); },
        handleStatusToggle,
        updatingStatusId
    ), [updateDepartment, handleStatusToggle, updatingStatusId, refetch]);

    const handleBulkToggle = async (showOnOrgChart: boolean) => {
        await bulkUpdateOrgChart.mutateAsync({ type: "DEPARTMENT", showOnOrgChart });
    };
    const [openImport, setOpenImport] = useState(false);
    const router = useRouter();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const deleteDepartment = useDeleteDepartment();
    const exportDepartments = useExportDepartments();
    const handleRefresh = () => { resetSort(); refetch(); };

    return (
        <>
            <OrgModulePage<Department>
                config={{
                    title: MODULE_IDENTITIES.DEPARTMENT.label,
                    icon: MODULE_IDENTITIES.DEPARTMENT.icon,
                    solidBg: MODULE_IDENTITIES.DEPARTMENT.solidBg,
                    titleGradient: MODULE_IDENTITIES.DEPARTMENT.titleGradient,
                    accentBorderClass: MODULE_IDENTITIES.DEPARTMENT.borderClass,
                    accentBgClass: MODULE_IDENTITIES.DEPARTMENT.bgColor,
                    accentTextClass: MODULE_IDENTITIES.DEPARTMENT.color,
                    permissionPrefix: "DEPARTMENT",
                    moduleKey: "departments",
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
                    singularLabel: "phòng ban",
                    searchPlaceholder: "Tìm kiếm theo mã, tên phòng ban...",
                    backHref: "/settings",
                }}
                data={departmentsData?.data || []}
                meta={departmentsData?.meta}
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
                onDelete={(id) => deleteDepartment.mutateAsync(id) as unknown as Promise<void>}
                onExport={async () => {
                    try { await exportDepartments.mutateAsync({ search }); toast.success("Xuất dữ liệu thành công!"); }
                    catch { toast.error("Lỗi xuất dữ liệu"); }
                }}
                isExporting={exportDepartments.isPending}
                onImport={() => setOpenImport(true)}
                onCreateClick={() => { setSelectedId(null); setIsFormOpen(true); }}
                onEditClick={(item) => { setSelectedId(item.id); setIsFormOpen(true); }}
                onBulkToggleOrgChart={handleBulkToggle}
                onToggleOrgChart={async (id, checked) => {
                    await updateDepartment.mutateAsync({ id, showOnOrgChart: checked });
                }}
                isTogglingOrgChart={bulkUpdateOrgChart.isPending}
                dialogs={
                    <>
                        <DepartmentForm 
                            variant="drawer"
                            open={isFormOpen}
                            onOpenChange={setIsFormOpen}
                            departmentId={selectedId}
                            onSuccess={refetch}
                        />
                        <ImportDepartmentDialog
                            open={openImport}
                            onOpenChange={setOpenImport}
                            onSuccess={refetch}
                            type="DEPARTMENT"
                        />
                    </>
                }
            />
        </>
    );
}
