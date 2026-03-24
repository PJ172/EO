"use client";

import { useState, useCallback } from "react";
import { usePositions, useCreatePosition, useUpdatePosition, useDeletePosition, useAssignEmployee, useUnassignEmployee, usePositionHolders, Position } from "@/services/position.service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/ui/page-header";
import { Plus, Pencil, Trash2, Users, Search, RefreshCw, ChevronRight, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface PositionFormData {
    name: string;
    code: string;
    description: string;
    departmentId: string;
    sectionId: string;
    parentPositionId: string;
}

const defaultForm: PositionFormData = {
    name: "",
    code: "",
    description: "",
    departmentId: "",
    sectionId: "",
    parentPositionId: "",
};

export default function PositionsPage() {
    const [search, setSearch] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
    const [formData, setFormData] = useState<PositionFormData>(defaultForm);

    const { data: positions, isLoading, refetch } = usePositions();
    const { data: holders } = usePositionHolders(selectedPosition?.id ?? null);
    const createPosition = useCreatePosition();
    const updatePosition = useUpdatePosition();
    const deletePosition = useDeletePosition();

    const filtered = (positions || []).filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
    );

    const openCreate = () => {
        setEditingId(null);
        setFormData(defaultForm);
        setIsFormOpen(true);
    };

    const openEdit = (pos: Position) => {
        setEditingId(pos.id);
        setFormData({
            name: pos.name,
            code: pos.code,
            description: pos.description || "",
            departmentId: pos.departmentId || "",
            sectionId: pos.sectionId || "",
            parentPositionId: pos.parentPositionId || "",
        });
        setIsFormOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.code) {
            toast.error("Tên và mã vị trí không được để trống.");
            return;
        }
        try {
            const payload = {
                name: formData.name,
                code: formData.code,
                description: formData.description || undefined,
                departmentId: formData.departmentId || undefined,
                sectionId: formData.sectionId || undefined,
                parentPositionId: formData.parentPositionId || undefined,
            };
            if (editingId) {
                await updatePosition.mutateAsync({ id: editingId, ...payload });
                toast.success("Đã cập nhật vị trí.");
            } else {
                await createPosition.mutateAsync(payload);
                toast.success("Đã tạo vị trí mới.");
            }
            setIsFormOpen(false);
            refetch();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Lỗi khi lưu vị trí.");
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            await deletePosition.mutateAsync(deletingId);
            toast.success("Đã xóa vị trí.");
            if (selectedPosition?.id === deletingId) setSelectedPosition(null);
            refetch();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Lỗi khi xóa.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="flex flex-col h-full gap-0">
            <PageHeader
                title="Quản lý Vị Trí / Chức Vụ"
                description="Định nghĩa các vị trí tổ chức và gán nhân viên vào vị trí tương ứng."
                icon={<Building2 className="w-5 h-5" />}
                actions={
                    <Button onClick={openCreate} size="sm" className="gap-1.5">
                        <Plus className="w-4 h-4" /> Tạo vị trí
                    </Button>
                }
            />

            <div className="flex flex-1 overflow-hidden">
                {/* Left: Position list */}
                <div className="w-[380px] flex flex-col border-r border-border bg-card">
                    <div className="p-3 border-b border-border flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm theo tên, mã..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => refetch()}>
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">Đang tải...</div>
                        ) : filtered.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">Chưa có vị trí nào.</div>
                        ) : (
                            <div className="divide-y divide-border">
                                {filtered.map(pos => (
                                    <div
                                        key={pos.id}
                                        onClick={() => setSelectedPosition(pos)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors group",
                                            selectedPosition?.id === pos.id && "bg-accent"
                                        )}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm truncate">{pos.name}</span>
                                                {!pos.isActive && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Ngừng</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs font-mono text-muted-foreground">{pos.code}</span>
                                                {pos.department && (
                                                    <span className="text-xs text-muted-foreground/60 truncate">· {pos.department.name}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {(pos._count?.assignments ?? 0) > 0 && (
                                                <Badge variant="secondary" className="text-xs gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {pos._count?.assignments}
                                                </Badge>
                                            )}
                                            <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(pos); }}>
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeletingId(pos.id); }}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Holders detail */}
                <div className="flex-1 overflow-y-auto bg-background/50">
                    {!selectedPosition ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                            <Building2 className="w-12 h-12 opacity-20" />
                            <p className="text-sm">Chọn một vị trí để xem nhân viên đang giữ</p>
                        </div>
                    ) : (
                        <div className="p-6 max-w-2xl">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold">{selectedPosition.name}</h2>
                                    <p className="text-sm text-muted-foreground font-mono mt-0.5">{selectedPosition.code}</p>
                                    {selectedPosition.description && (
                                        <p className="text-sm text-muted-foreground mt-2">{selectedPosition.description}</p>
                                    )}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => openEdit(selectedPosition)} className="gap-1.5">
                                    <Pencil className="w-3.5 h-3.5" /> Sửa
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-sm flex items-center gap-2">
                                        <Users className="w-4 h-4" /> Nhân viên đang giữ vị trí
                                        <Badge variant="secondary">{holders?.length ?? 0}</Badge>
                                    </h3>
                                </div>

                                {!holders || holders.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
                                        Chưa có nhân viên nào giữ vị trí này.
                                        <br />
                                        <span className="text-xs">Dùng form sửa nhân viên để gán vào vị trí.</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {holders.map(h => (
                                            <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={h.employee.avatar} />
                                                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                                        {h.employee.fullName.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm">{h.employee.fullName}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                        <span className="font-mono">{h.employee.employeeCode}</span>
                                                        {h.employee.department && <span>· {h.employee.department.name}</span>}
                                                    </div>
                                                </div>
                                                {h.isPrimary && (
                                                    <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">Chính</Badge>
                                                )}
                                                <div className="text-xs text-muted-foreground">
                                                    từ {new Date(h.startDate).toLocaleDateString("vi-VN")}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Form Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Sửa vị trí" : "Tạo vị trí mới"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Tên vị trí <span className="text-destructive">*</span></Label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Trưởng Ca Sản Xuất"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Mã vị trí <span className="text-destructive">*</span></Label>
                                <Input
                                    value={formData.code}
                                    onChange={e => setFormData(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                    placeholder="TC-SX"
                                    className="font-mono"
                                    disabled={!!editingId}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Mô tả</Label>
                            <Input
                                value={formData.description}
                                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                                placeholder="Mô tả ngắn về vị trí..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>Hủy</Button>
                        <Button onClick={handleSubmit} disabled={createPosition.isPending || updatePosition.isPending}>
                            {editingId ? "Lưu thay đổi" : "Tạo vị trí"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xóa vị trí?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này sẽ xóa vị trí và hủy liên kết với tất cả nhân viên đang giữ. Không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
