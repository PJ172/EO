"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { OrgModulePage, OrgColumnDef } from "@/components/organization/org-module-page";
import { MapPin } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { apiClient as api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type JobPosition = {
    id: string;
    code: string;
    name: string;
    description?: string;
    status: "ACTIVE" | "INACTIVE";
    departmentId?: string;
    jobTitleId?: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: { username: string };
};

const MODULE_CONFIG = {
    title: "VỊ TRÍ CÔNG VIỆC",
    icon: MapPin,
    solidBg: "bg-gradient-to-br from-cyan-500 to-sky-700",
    titleGradient: "from-cyan-500 to-sky-700 dark:from-cyan-400 dark:to-sky-300",
    accentBorderClass: "border-l-cyan-500",
    accentBgClass: "bg-cyan-500/10",
    accentTextClass: "text-cyan-600 dark:text-cyan-400",
    permissionPrefix: "SETTINGS",
    moduleKey: "job-positions",
    singularLabel: "vị trí công việc",
    searchPlaceholder: "Tìm kiếm theo mã, tên vị trí...",
    backHref: "/settings",
};

const getColumns = (
    onStatusToggle: (id: string, currentStatus: string) => void,
    isUpdatingStatus: string | null,
): OrgColumnDef<JobPosition>[] => [
    {
        key: "code",
        label: "Mã vị trí",
        sortable: true,
        className: "w-[110px]",
        render: (item) => (
            <span className="font-mono text-sm text-muted-foreground">{item.code}</span>
        ),
    },
    {
        key: "name",
        label: "Tên vị trí",
        sortable: true,
        render: (item) => (
            <span className="font-medium text-cyan-600 dark:text-cyan-500">{item.name}</span>
        ),
    },
    {
        key: "description",
        label: "Mô tả",
        sortable: false,
        render: (item) => (
            <span className="text-sm text-muted-foreground">
                {item.description || <span className="text-muted-foreground/50 italic">—</span>}
            </span>
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
        key: "showOnOrgChart",
        label: "Sơ đồ",
        className: "w-[80px] text-center",
        // Render will be safely intercepted by universal implementation in OrgModulePage
        render: (item) => <div />
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
];

function JobPositionForm({
    open,
    onOpenChange,
    positionId,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    positionId: string | null;
    onSuccess: () => void;
}) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ code: "", name: "", description: "", status: "ACTIVE" });

    const { data: existing } = useQuery<JobPosition>({
        queryKey: ["job-position", positionId],
        queryFn: () => api.get(`/job-positions/${positionId}`).then((r: any) => r.data),
        enabled: !!positionId && open,
    });

    // Populate form when editing
    useState(() => {
        if (existing) setForm({
            code: existing.code,
            name: existing.name,
            description: existing.description ?? "",
            status: existing.status,
        });
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/job-positions", data),
        onSuccess: () => { toast.success("Tạo vị trí thành công!"); onSuccess(); onOpenChange(false); queryClient.invalidateQueries({ queryKey: ["job-positions"] }); },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Lỗi khi tạo"),
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/job-positions/${positionId}`, data),
        onSuccess: () => { toast.success("Cập nhật thành công!"); onSuccess(); onOpenChange(false); queryClient.invalidateQueries({ queryKey: ["job-positions"] }); },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Lỗi khi cập nhật"),
    });

    const handleSubmit = () => {
        if (!form.code || !form.name) return toast.error("Vui lòng nhập đủ Mã và Tên");
        if (positionId) updateMutation.mutate(form);
        else createMutation.mutate(form);
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-cyan-500" />
                        {positionId ? "Chỉnh sửa vị trí" : "Thêm vị trí công việc"}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Mã vị trí *</Label>
                            <Input
                                placeholder="VP00001"
                                value={form.code}
                                disabled={!!positionId}
                                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Trạng thái</Label>
                            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                                    <SelectItem value="INACTIVE">Ngừng hoạt động</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Tên vị trí *</Label>
                        <Input
                            placeholder="VD: Chuyên viên Kế toán"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Mô tả</Label>
                        <Input
                            placeholder="Mô tả ngắn về vị trí..."
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending ? "Đang lưu..." : positionId ? "Cập nhật" : "Tạo mới"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function JobPositionsPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

    const { data: listData, isLoading, refetch } = useQuery<{ data: JobPosition[]; meta: any }>({
        queryKey: ["job-positions", page, pageSize, search],
        queryFn: () => api.get(`/job-positions?search=${search}&page=${page}&limit=${pageSize}`).then((r: any) => r.data),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/job-positions/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["job-positions"] }); toast.success("Đã xóa vị trí"); },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, status, showOnOrgChart }: { id: string; status?: string; showOnOrgChart?: boolean }) => {
            const payload: any = {};
            if (status !== undefined) payload.status = status;
            if (showOnOrgChart !== undefined) payload.showOnOrgChart = showOnOrgChart;
            return api.put(`/job-positions/${id}`, payload);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-positions"] }),
    });

    const bulkUpdateOrgChart = useMutation({
        mutationFn: ({ showOnOrgChart }: { showOnOrgChart: boolean }) => api.post(`/job-positions/bulk-org-chart`, { showOnOrgChart }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-positions"] }),
    });

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        setUpdatingStatusId(id);
        try {
            const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await updateMutation.mutateAsync({ id, status: newStatus });
            toast.success(`Đã ${newStatus === "ACTIVE" ? "kích hoạt" : "vô hiệu hóa"} vị trí`);
        } catch {
            toast.error("Lỗi cập nhật trạng thái");
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const columns = useMemo(() => getColumns(handleStatusToggle, updatingStatusId), [updatingStatusId]);

    const activeCount = (listData?.data ?? []).filter((d) => d.status === "ACTIVE").length;

    return (
        <>
            <OrgModulePage<JobPosition>
                config={{
                    ...MODULE_CONFIG,
                    columns,
                    getId: (d) => d.id,
                    getName: (d) => d.name,
                    getStatus: (d) => d.status,
                    getEmployeeCount: () => 0,
                    getAuditInfo: (d) => ({
                        createdBy: d.createdBy?.username,
                        createdAt: d.createdAt,
                        updatedAt: d.updatedAt,
                    }),
                    clickableKeys: ["code", "name"],
                }}
                data={listData?.data || []}
                meta={listData?.meta}
                isLoading={isLoading}
                refetch={refetch}
                onRefreshWithReset={refetch}
                page={page}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                search={search}
                onSearchChange={setSearch}
                sortKey="code"
                sortDir="asc"
                onSort={() => {}}
                onDelete={(id) => deleteMutation.mutateAsync(id)}
                onCreateClick={() => { setSelectedId(null); setIsFormOpen(true); }}
                onEditClick={(item) => { setSelectedId(item.id); setIsFormOpen(true); }}
                onExport={() => toast.info("Tính năng Xuất Excel đang được phát triển...")}
                onImport={() => toast.info("Tính năng Nhập Excel đang được phát triển...")}
                onBulkToggleOrgChart={async (showOnOrgChart) => {
                    await bulkUpdateOrgChart.mutateAsync({ showOnOrgChart });
                }}
                onToggleOrgChart={async (id, checked) => {
                    await updateMutation.mutateAsync({ id, showOnOrgChart: checked });
                }}
                isTogglingOrgChart={bulkUpdateOrgChart.isPending}
                dialogs={
                    <JobPositionForm
                        open={isFormOpen}
                        onOpenChange={setIsFormOpen}
                        positionId={selectedId}
                        onSuccess={refetch}
                    />
                }
            />
        </>
    );
}
