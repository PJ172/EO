"use client";

import { getAvatarVariant } from "@/lib/utils";
import { useState, useMemo, useCallback } from "react";
import { useSortState } from "@/hooks/use-sort-state";
import { useCompanies, useDeleteCompany, useUpdateCompany, Company } from "@/services/company.service";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { CompanyForm } from "@/components/companies/company-form";
import { OrgModulePage, OrgColumnDef } from "@/components/organization/org-module-page";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MODULE_IDENTITIES } from "@/config/module-identities";
import { toast } from "sonner";
import { apiPost, apiDelete } from "@/lib/api-client";
import { useExportDepartments, useBulkUpdateOrgChart } from "@/services/department.service";
import { ImportDepartmentDialog } from "@/components/departments/import-department-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

const getColumns = (
    onToggle: (id: string, checked: boolean) => void,
    onToggleExclude: (id: string, checked: boolean) => void,
    onStatusToggle: (id: string, currentStatus: string) => void,
    isUpdatingStatus: string | null
): OrgColumnDef<Company>[] => [
    {
        key: "code",
        label: "Mã công ty",
        sortable: true,
        className: "w-[120px]",
        render: (item) => (
            <span className="font-mono text-sm text-muted-foreground">{item.code}</span>
        ),
    },
    {
        key: "name",
        label: "Tên công ty",
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
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-none">
                        {item.manager?.fullName || <span className="text-muted-foreground/50 font-normal italic">Chưa cập nhật</span>}
                    </span>
                    {item.manager?.fullName && (
                        <span className="text-[10px] text-muted-foreground mt-1">
                            {(item.manager as any).jobTitle?.name || "Giám đốc"}
                        </span>
                    )}
                </div>
            </div>
        ),
    },
    {
        key: "address",
        label: "Địa chỉ",
        sortable: false,
        render: (item) => (
            <span className="text-sm text-muted-foreground">{(item as any).address || <span className="text-muted-foreground/50 italic">—</span>}</span>
        ),
    },
    {
        key: "note",
        label: "Ghi chú",
        sortable: false,
        render: (item) => (
            <span className="text-sm text-muted-foreground">{(item as any).note || <span className="text-muted-foreground/50 italic">—</span>}</span>
        ),
    },
    {
        key: "employeeCount",
        label: "Nhân sự",
        className: "w-[100px] text-center",
        render: (item) => (
            item._count?.employees && item._count.employees > 0 ? (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-500/20 min-w-[2rem] shadow-sm">
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
                    checked={item.showOnOrgChart}
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
];

export default function CompanyListPage() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const { sortKey, sortDir, handleSort, resetSort } = useSortState("companies", "code", "asc");
    const router = useRouter();

    const updateCompany = useUpdateCompany();
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

    const { data: companiesData, isLoading, refetch } = useCompanies({
        page, limit: pageSize, search,
        sort: sortKey,
        order: sortDir,
    });

    const handleStatusToggle = useCallback(async (id: string, currentStatus: string) => {
        try {
            setUpdatingStatusId(id);
            const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await updateCompany.mutateAsync({ id, status: newStatus });
            toast.success(`Đã ${newStatus === "ACTIVE" ? "kích hoạt" : "vô hiệu hóa"} công ty`);
            refetch();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Lỗi khi cập nhật trạng thái");
        } finally {
            setUpdatingStatusId(null);
        }
    }, [updateCompany, refetch]);

    const bulkUpdateOrgChart = useBulkUpdateOrgChart();
    const columns = useMemo(() => getColumns(
        async (id, checked) => { await updateCompany.mutateAsync({ id, showOnOrgChart: checked }); refetch(); },
        async (id, checked) => { await updateCompany.mutateAsync({ id, excludeFromFilters: checked } as any); refetch(); },
        handleStatusToggle,
        updatingStatusId
    ), [updateCompany, handleStatusToggle, updatingStatusId, refetch]);

    const deleteCompany = useDeleteCompany();
    const exportDepartments = useExportDepartments();
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const handleRefresh = () => { resetSort(); refetch(); };

    const handleExport = async () => {
        try {
            await exportDepartments.mutateAsync({ type: "COMPANY", search });
            toast.success("Xuất dữ liệu công ty thành công!");
        } catch {
            toast.error("Lỗi xuất dữ liệu");
        }
    };

    const handleBulkToggle = async (showOnOrgChart: boolean) => {
        await bulkUpdateOrgChart.mutateAsync({ type: "COMPANY", showOnOrgChart });
    };

    return (
        <>
            <OrgModulePage<Company>
                config={{
                    title: MODULE_IDENTITIES.COMPANY.label,
                    icon: MODULE_IDENTITIES.COMPANY.icon,
                    solidBg: MODULE_IDENTITIES.COMPANY.solidBg,
                    titleGradient: MODULE_IDENTITIES.COMPANY.titleGradient,
                    accentBorderClass: MODULE_IDENTITIES.COMPANY.borderClass,
                    accentBgClass: MODULE_IDENTITIES.COMPANY.bgColor,
                    accentTextClass: MODULE_IDENTITIES.COMPANY.color,
                    permissionPrefix: "COMPANY",
                    moduleKey: "companies",
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
                    singularLabel: "công ty",
                    searchPlaceholder: "Tìm kiếm theo mã, tên công ty...",
                    backHref: "/settings",
                }}
                data={companiesData?.data || []}
                meta={companiesData?.meta}
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
                onDelete={(id) => deleteCompany.mutateAsync(id) as Promise<void>}
                onCreateClick={() => { setSelectedId(null); setIsFormOpen(true); }}
                onEditClick={(item) => { setSelectedId(item.id); setIsFormOpen(true); }}
                onExport={handleExport}
                isExporting={exportDepartments.isPending}
                onImport={() => setIsImportOpen(true)}
                onBulkToggleOrgChart={handleBulkToggle}
                onToggleOrgChart={async (id, checked) => {
                    await updateCompany.mutateAsync({ id, showOnOrgChart: checked });
                }}
                isTogglingOrgChart={bulkUpdateOrgChart.isPending}
                dialogs={
                    <>
                        <CompanyForm 
                            variant="drawer"
                            open={isFormOpen}
                            onOpenChange={setIsFormOpen}
                            companyId={selectedId}
                            onSuccess={refetch}
                        />
                        <ImportDepartmentDialog
                            open={isImportOpen}
                            onOpenChange={setIsImportOpen}
                            onSuccess={refetch}
                            type="COMPANY"
                        />
                    </>
                }
            />
        </>
    );
}
