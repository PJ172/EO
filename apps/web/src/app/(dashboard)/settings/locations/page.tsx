"use client";

import { useState, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { useSortState } from "@/hooks/use-sort-state";
import {
    useLocations, useDeleteLocation, useUpdateLocation, useBulkDeleteLocations, Location,
} from "@/services/location.service";
import { OrgModulePage, OrgColumnDef } from "@/components/organization/org-module-page";
import { MapPin } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { LocationForm } from "@/components/locations/location-form";

const getColumns = (
    onStatusToggle: (id: string, currentStatus: string) => void,
    isUpdatingStatus: string | null
): OrgColumnDef<Location>[] => [
    {
        key: "code",
        label: "Mã vị trí",
        sortable: true,
        className: "w-[120px]",
        render: (item) => (
            <span className="font-mono text-sm font-semibold text-violet-600 dark:text-violet-400 tracking-wider">{item.code}</span>
        ),
    },
    {
        key: "prefix",
        label: "Tiền tố",
        sortable: true,
        className: "w-[80px]",
        render: (item) => (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded font-mono text-xs font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                {item.prefix}
            </span>
        ),
    },
    {
        key: "name",
        label: "Tên vị trí",
        sortable: true,
        render: (item) => (
            <span className="font-medium text-foreground">{item.name}</span>
        ),
    },
    {
        key: "detail",
        label: "Chi tiết",
        sortable: false,
        className: "w-[180px]",
        render: (item) => (
            <span className="text-sm text-muted-foreground">
                {item.detail || <span className="text-muted-foreground/50 italic">—</span>}
            </span>
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

export default function LocationsPage() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const { sortKey, sortDir, handleSort, resetSort } = useSortState("locations", "createdAt", "desc");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

    const updateLocation = useUpdateLocation();
    const deleteLocation = useDeleteLocation();
    const bulkDeleteLocations = useBulkDeleteLocations();

    const { data: locationsData, isLoading, refetch } = useLocations({
        page, limit: pageSize, search, sortBy: sortKey, order: sortDir,
    });

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        try {
            setUpdatingStatusId(id);
            const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await updateLocation.mutateAsync({ id, status: newStatus });
            toast.success(`Đã ${newStatus === "ACTIVE" ? "kích hoạt" : "vô hiệu hóa"} vị trí`);
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
            <OrgModulePage<Location>
                config={{
                    title: "VỊ TRÍ CNTT",
                    icon: MapPin,
                    solidBg: "bg-gradient-to-br from-violet-500 to-indigo-600",
                    titleGradient: "from-violet-600 to-indigo-700",
                    accentBorderClass: "border-violet-200 dark:border-violet-800",
                    accentBgClass: "bg-violet-500/10",
                    accentTextClass: "text-violet-600 dark:text-violet-400",
                    permissionPrefix: "SETTINGS",
                    moduleKey: "locations",
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
                    singularLabel: "vị trí",
                    searchPlaceholder: "Tìm kiếm theo mã, tên, chi tiết vị trí...",
                    backHref: "/settings",
                }}
                data={locationsData?.data || []}
                meta={locationsData?.meta}
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
                onDelete={async (id) => { await deleteLocation.mutateAsync(id); }}
                onBulkDelete={async (ids) => {
                    const results = await bulkDeleteLocations.mutateAsync(ids);
                    if (results.success > 0) toast.success(`Đã xóa ${results.success} vị trí`);
                    if (results.failed > 0) toast.error(`Có ${results.failed} lỗi xóa`);
                }}
                onCreateClick={() => { setSelectedId(null); setIsFormOpen(true); }}
                onEditClick={(item) => { setSelectedId(item.id); setIsFormOpen(true); }}
                dialogs={
                    <LocationForm
                        locationId={selectedId}
                        open={isFormOpen}
                        onOpenChange={setIsFormOpen}
                        onSuccess={refetch}
                    />
                }
            />
        </>
    );
}
