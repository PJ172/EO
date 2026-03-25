"use client";

import { useState, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { useSortState } from "@/hooks/use-sort-state";
import { useJobTitles, useDeleteJobTitle, useExportJobTitles, JobTitle, useCreateJobTitle, useUpdateJobTitle, useBulkDeleteJobTitles } from "@/services/job-title.service";
import { ImportJobTitleDialog } from "@/components/job-titles/import-job-title-dialog";
import { OrgModulePage, OrgColumnDef } from "@/components/organization/org-module-page";
import { Briefcase, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { JobTitleForm } from "@/components/job-titles/job-title-form";
import { useRouter } from "next/navigation";
import { MODULE_IDENTITIES } from "@/config/module-identities";

const getColumns = (
    onStatusToggle: (id: string, currentStatus: string) => void,
    isUpdatingStatus: string | null
): OrgColumnDef<JobTitle>[] => [
    {
        key: "code",
        label: "Mã chức danh",
        sortable: true,
        className: "w-[100px]",
        render: (item) => (
            <span className="font-mono text-sm text-muted-foreground">{item.code}</span>
        ),
    },
    {
        key: "name",
        label: "Tên chức danh",
        sortable: true,
        render: (item) => (
            <span className="font-medium text-blue-600 dark:text-blue-500">{item.name}</span>
        ),
    },
    {
        key: "description",
        label: "Mô tả",
        sortable: false,
        render: (item) => (
            <span className="text-sm text-muted-foreground">{item.description || <span className="text-muted-foreground/50 italic">—</span>}</span>
        ),
    },
    {
        key: "employeeCount",
        label: "Nhân sự",
        sortable: false,
        className: "w-[100px] text-center",
        render: (item) => (
            (item._count?.employees ?? 0) > 0 ? (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-500/20 min-w-[2rem] shadow-sm">
                    {item._count?.employees}
                </span>
            ) : (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border min-w-[2rem]">
                    0
                </span>
            )
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
        key: "createdAt",
        label: "Ngày tạo",
        sortable: true,
        className: "whitespace-nowrap",
        render: (item) => (
            <span className="text-sm text-muted-foreground/80">{item.createdAt ? format(new Date(item.createdAt), "dd/MM/yyyy HH:mm") : ""}</span>
        ),
    },
];



export default function JobTitlesPage() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const { sortKey, sortDir, handleSort, resetSort } = useSortState("job-titles", "code", "asc");
    const [openImport, setOpenImport] = useState(false);

    const updateJobTitle = useUpdateJobTitle();
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

    const { data: jobTitlesData, isLoading, refetch } = useJobTitles({
        page, limit: pageSize, search,
        sortBy: sortKey,
        order: sortDir,
    });

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        try {
            setUpdatingStatusId(id);
            const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await updateJobTitle.mutateAsync({ id, status: newStatus });
            toast.success(`Đã ${newStatus === "ACTIVE" ? "kích hoạt" : "vô hiệu hóa"} chức danh`);
            refetch();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Lỗi khi cập nhật trạng thái");
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const columns = useMemo(() => getColumns(handleStatusToggle, updatingStatusId), [updatingStatusId, refetch]);
    const router = useRouter();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const deleteJobTitle = useDeleteJobTitle();
    const exportJobTitles = useExportJobTitles();
    const bulkDeleteJobTitles = useBulkDeleteJobTitles();
    const handleRefresh = () => { resetSort(); refetch(); };

    return (
        <>
            <OrgModulePage<JobTitle>
                config={{
                    title: MODULE_IDENTITIES.JOB_TITLE.label,
                    icon: MODULE_IDENTITIES.JOB_TITLE.icon,
                    solidBg: MODULE_IDENTITIES.JOB_TITLE.solidBg,
                    titleGradient: MODULE_IDENTITIES.JOB_TITLE.titleGradient,
                    accentBorderClass: MODULE_IDENTITIES.JOB_TITLE.borderClass,
                    accentBgClass: MODULE_IDENTITIES.JOB_TITLE.bgColor,
                    accentTextClass: MODULE_IDENTITIES.JOB_TITLE.color,
                    permissionPrefix: "JOBTITLE",
                    moduleKey: "job-titles",
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
                    singularLabel: "chức danh",
                    searchPlaceholder: "Tìm kiếm theo mã, tên chức danh...",
                    backHref: "/settings",
                }}
                data={jobTitlesData?.data || []}
                meta={jobTitlesData?.meta}
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
                onDelete={(id) => deleteJobTitle.mutateAsync(id)}
                onBulkDelete={async (ids) => {
                    const results = await bulkDeleteJobTitles.mutateAsync(ids);
                    if (results.success > 0) toast.success(`Đã xóa ${results.success} chức danh`);
                    if (results.failed > 0) {
                        toast.error(`Có ${results.failed} lỗi: ${results.errors[0] || "Lỗi khi xóa"}`);
                    }
                }}
                onExport={async () => {
                    try { await exportJobTitles.mutateAsync({ search }); toast.success("Xuất dữ liệu thành công!"); }
                    catch { toast.error("Lỗi xuất dữ liệu"); }
                }}
                isExporting={exportJobTitles.isPending}
                onImport={() => setOpenImport(true)}
                onCreateClick={() =>  { setSelectedId(null); setIsFormOpen(true); }}
                onEditClick={(item) =>  { setSelectedId(item.id); setIsFormOpen(true); }}
                dialogs={
                    <>
                        <JobTitleForm 
                            variant="drawer"
                            open={isFormOpen}
                            onOpenChange={setIsFormOpen}
                            jobTitleId={selectedId}
                            onSuccess={refetch}
                        />
                        <ImportJobTitleDialog
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
