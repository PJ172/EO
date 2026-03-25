"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Sheet,
    SheetContent,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    GripVertical, Eye, RotateCcw, Save, Columns3,
    Shield, Users, Building2, X, Search, User, ShieldCheck,
    Pencil, Trash2, CircleOff, Copy, ChevronUp, ChevronDown, RefreshCw, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { ColumnItem, useUpsertColumnConfig, useUpdateColumnConfig, useAllColumnConfigs, useDeleteColumnConfig, useReorderColumnConfigs } from "@/services/column-config.service";
import { useDepartments } from "@/services/department.service";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

interface ColumnConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    moduleKey: string;
    allColumns: ColumnItem[];
    defaultColumns: { key: string; label: string; defaultVisible?: boolean }[];
}

interface RoleOption { id: string; code: string; name: string; }
interface UserOption { id: string; username: string; email: string; employee?: { fullName: string; employeeCode: string } | null; }
type ApplyScope = "ALL" | "DEPARTMENT" | "ROLE" | "USER" | "NONE";

export function ColumnConfigDialog({
    open, onOpenChange, moduleKey, allColumns, defaultColumns,
}: ColumnConfigDialogProps) {
    const [columns, setColumns] = useState<ColumnItem[]>([]);
    const [applyTo, setApplyTo] = useState<ApplyScope>("ALL");
    const [configName, setConfigName] = useState("");
    const [selectedTargets, setSelectedTargets] = useState<{ id: string; label: string; sub?: string }[]>([]);
    const [targetSearch, setTargetSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<"config" | "saved">("config");
    const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

    const upsertConfig = useUpsertColumnConfig();
    const updateConfig = useUpdateColumnConfig();
    const deleteConfig = useDeleteColumnConfig();
    const reorderConfigsMutation = useReorderColumnConfigs();
    const { data: savedConfigs, refetch: refetchConfigs, isFetching: isRefetching } = useAllColumnConfigs(moduleKey);
    const { data: deptData } = useDepartments({ limit: 200 });

    const { data: rolesData } = useQuery({
        queryKey: ["roles-for-column-config"],
        queryFn: () => apiGet<RoleOption[]>("/roles"),
        staleTime: 5 * 60 * 1000,
        enabled: open && applyTo === "ROLE",
    });

    // Debounce the target search
    const [debouncedSearch, setDebouncedSearch] = useState(targetSearch);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(targetSearch);
        }, 500);
        return () => clearTimeout(timer);
    }, [targetSearch]);

    const { data: usersData, isFetching: isFetchingUsers } = useQuery({
        queryKey: ["users-for-column-config", debouncedSearch],
        queryFn: () => apiGet<{ data: UserOption[]; meta: any }>(`/users?limit=200${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`),
        staleTime: 30 * 1000,
        enabled: open && applyTo === "USER",
    });

    const departments = useMemo(() => deptData?.data || [], [deptData]);
    const roles = useMemo(() => rolesData || [], [rolesData]);
    const users = useMemo(() => usersData?.data || [], [usersData]);

    // DnD Sensors for saved configs
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleSavedConfigDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !savedConfigs) return;

        const oldIndex = optimisticConfigs.findIndex(item => item.id === active.id);
        const newIndex = optimisticConfigs.findIndex(item => item.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            // Optimistically update the UI immediately
            const reorderedConfigs = arrayMove(optimisticConfigs, oldIndex, newIndex);
            setOptimisticConfigs(reorderedConfigs);

            // Map to the required { id, order } array for the backend
            const payload = reorderedConfigs.map((cfg, index) => ({
                id: cfg.id,
                order: index
            }));

            reorderConfigsMutation.mutate(payload, {
                onSuccess: () => refetchConfigs()
            });
        }
    };

    const filteredOptions = useMemo(() => {
        const selectedIds = new Set(selectedTargets.map(t => t.id));
        const search = targetSearch.toLowerCase();
        if (applyTo === "DEPARTMENT") {
            return departments.filter(d => !selectedIds.has(d.id)).filter(d => !search || d.name.toLowerCase().includes(search) || d.code.toLowerCase().includes(search)).map(d => ({ id: d.id, label: d.name, sub: d.code }));
        }
        if (applyTo === "ROLE") {
            return roles.filter(r => !selectedIds.has(r.id)).filter(r => !search || r.name.toLowerCase().includes(search) || r.code.toLowerCase().includes(search)).map(r => ({ id: r.id, label: r.name, sub: r.code }));
        }
        if (applyTo === "USER") {
            return users.filter(u => !selectedIds.has(u.id)).filter(u => !search || u.username.toLowerCase().includes(search) || u.email.toLowerCase().includes(search) || u.employee?.fullName.toLowerCase().includes(search)).map(u => ({ id: u.id, label: u.employee?.fullName || u.username, sub: u.employee?.employeeCode || u.email }));
        }
        return [];
    }, [applyTo, selectedTargets, targetSearch, departments, roles, users]);

    useEffect(() => {
        if (open && allColumns.length > 0) {
            // Deduplicate by key — keep first occurrence
            const seen = new Map<string, typeof allColumns[0]>();
            for (const col of [...allColumns].sort((a, b) => a.order - b.order)) {
                if (!seen.has(col.key)) seen.set(col.key, col);
            }
            // Only set this if we haven't already populated columns for this session
            // to avoid resetting the tab and state when allColumns reference changes
            setColumns(prev => prev.length === 0 ? Array.from(seen.values()) : prev);
        }
    }, [open, allColumns]);

    // Initialization effect when dialog is first opened
    useEffect(() => {
        if (open) {
            setActiveTab("config");
            setSelectedTargets([]);
            setApplyTo("ALL");
            setConfigName("");
            setTargetSearch("");
            setShowDropdown(false);
            setEditingConfigId(null);
        } else {
            // Reset local columns state when closed so it re-initializes on next open
            setColumns([]);
        }
    }, [open]);

    // Local state for drag and drop to avoid jumping visually
    const [optimisticConfigs, setOptimisticConfigs] = useState<any[]>([]);
    useEffect(() => {
        if (savedConfigs) setOptimisticConfigs(savedConfigs);
    }, [savedConfigs]);

    useEffect(() => {
        if (!showDropdown) return;
        const handler = (e: MouseEvent) => {
            const el = (e.target as HTMLElement).closest("[data-dropdown-container]");
            if (!el) setShowDropdown(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showDropdown]);

    const handleToggleVisible = (index: number) => {
        setColumns(prev => prev.map((col, i) => i === index ? { ...col, visible: !col.visible } : col));
    };

    const handleToggleAll = (visible: boolean) => {
        setColumns(prev => prev.map(col => ({ ...col, visible })));
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = "move";
        setTimeout(() => { (e.target as HTMLElement).style.opacity = "0.4"; }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.target as HTMLElement).style.opacity = "1";
        setDragIndex(null);
        setDragOverIndex(null);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverIndex !== index) setDragOverIndex(index);
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === dropIndex) return;
        setColumns(prev => {
            const newCols = [...prev];
            const [dragged] = newCols.splice(dragIndex, 1);
            newCols.splice(dropIndex, 0, dragged);
            return newCols.map((col, i) => ({ ...col, order: i }));
        });
        setDragIndex(null);
        setDragOverIndex(null);
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        setColumns(prev => {
            const newCols = [...prev];
            const temp = newCols[index];
            newCols[index] = newCols[index - 1];
            newCols[index - 1] = temp;
            return newCols.map((col, i) => ({ ...col, order: i }));
        });
    };

    const handleMoveDown = (index: number) => {
        if (index === columns.length - 1) return;
        setColumns(prev => {
            const newCols = [...prev];
            const temp = newCols[index];
            newCols[index] = newCols[index + 1];
            newCols[index + 1] = temp;
            return newCols.map((col, i) => ({ ...col, order: i }));
        });
    };

    const handleReset = () => {
        setColumns(defaultColumns.map((col, i) => ({
            key: col.key, label: col.label, visible: col.defaultVisible !== false, order: i,
        })));
        setEditingConfigId(null);
        setConfigName("");
        toast.info("Đã đặt lại thứ tự mặc định");
    };

    const handleSave = async () => {
        if (editingConfigId && !showUpdateConfirm) {
            setShowUpdateConfirm(true);
            return;
        }
        await executeSave();
    };

    const executeSave = async () => {
        try {
            const colData = columns.map((col, i) => ({ ...col, order: i }));
            let savePromises = [];

            if (applyTo === "ALL" || applyTo === "NONE") {
                let payload: any;

                if (editingConfigId) {
                    // Editing existing: preserve original targetId for NONE configs
                    const existingConfig = savedConfigs?.find(c => c.id === editingConfigId);
                    const targetIdToSave = (applyTo === "NONE" && existingConfig?.applyTo === "NONE")
                        ? existingConfig.targetId
                        : undefined;
                    payload = {
                        moduleKey,
                        columns: colData,
                        applyTo: applyTo as any,
                        name: configName || undefined,
                        targetId: targetIdToSave,
                    };
                    savePromises.push(updateConfig.mutateAsync({ id: editingConfigId, data: payload }));
                } else {
                    // Creating new:
                    // - NONE always gets a fresh UUID so it never collides with existing records
                    // - ALL uses upsert (overwriting the single ALL config is intentional)
                    const targetIdToSave = applyTo === "NONE" ? generateUUID() : undefined;
                    payload = {
                        moduleKey,
                        columns: colData,
                        applyTo: applyTo as any,
                        name: configName || undefined,
                        targetId: targetIdToSave,
                    };
                    savePromises.push(upsertConfig.mutateAsync(payload));
                }
            } else {
                const apiScope = applyTo === "DEPARTMENT" ? "ROLE" : applyTo;

                if (editingConfigId) {
                    if (selectedTargets.length > 0) {
                        const firstTarget = selectedTargets[0];
                        savePromises.push(updateConfig.mutateAsync({
                            id: editingConfigId,
                            data: { moduleKey, columns: colData, applyTo: apiScope as "ROLE" | "USER", targetId: firstTarget.id, name: configName || undefined }
                        }));

                        for (let i = 1; i < selectedTargets.length; i++) {
                            savePromises.push(upsertConfig.mutateAsync({ moduleKey, columns: colData, applyTo: apiScope as "ROLE" | "USER", targetId: selectedTargets[i].id, name: configName || undefined }));
                        }
                    }
                } else {
                    for (const target of selectedTargets) {
                        savePromises.push(upsertConfig.mutateAsync({ moduleKey, columns: colData, applyTo: apiScope as "ROLE" | "USER", targetId: target.id, name: configName || undefined }));
                    }
                }
            }

            await Promise.all(savePromises);
            refetchConfigs();
            toast.success(applyTo === "ALL" ? "Đã lưu cấu hình cho tất cả!" : applyTo === "NONE" ? "Đã lưu cấu hình (chưa áp dụng)!" : `Đã lưu cấu hình cho ${selectedTargets.length} đối tượng!`);
            setEditingConfigId(null);
            setShowUpdateConfirm(false);
        } catch (err: any) {
            toast.error(err?.message || "Lỗi lưu cấu hình. Vui lòng thử lại.");
        }
    };

    const handleDeleteConfig = (id: string) => {
        setDeleteConfirmId(id);
    };


    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await deleteConfig.mutateAsync(deleteConfirmId);
            refetchConfigs();
            toast.success("Đã xóa cấu hình");
            setDeleteConfirmId(null);
        } catch { toast.error("Lỗi xóa cấu hình"); }
    };

    const handleMoveSavedConfig = async (index: number, direction: 'up' | 'down') => {
        if (!savedConfigs) return;
        const newConfigs = [...savedConfigs];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= newConfigs.length) return;

        // Swap locally
        const temp = newConfigs[index];
        newConfigs[index] = newConfigs[swapIndex];
        newConfigs[swapIndex] = temp;

        // Prepare order map payload
        const itemsToUpdate = newConfigs.map((c, i) => ({ id: c.id, order: i }));
        try {
            await reorderConfigsMutation.mutateAsync(itemsToUpdate);
            refetchConfigs();
        } catch {
            toast.error("Lỗi sắp xếp cấu hình");
        }
    };

    // Load saved config back into editor
    const handleLoadConfig = (config: any) => {
        const rawCols = config.columns as ColumnItem[];
        // Filter out obsolete columns that don't exist in defaultColumns anymore
        const validKeys = new Set(defaultColumns.map(c => c.key));
        const savedCols = rawCols.filter(c => validKeys.has(c.key)).sort((a, b) => a.order - b.order);

        // Merge missing default columns (newly added features)
        const savedKeys = new Set(savedCols.map(c => c.key));
        const missingCols = defaultColumns
            .filter(dc => !savedKeys.has(dc.key))
            .map((dc, i) => ({
                key: dc.key,
                label: dc.label,
                visible: dc.defaultVisible !== false,
                order: savedCols.length + i
            }));

        const mergedCols = [...savedCols, ...missingCols].map((col, i) => ({ ...col, order: i }));

        setColumns(mergedCols);
        setEditingConfigId(config.id);
        setConfigName(config.name || "");

        // Resolve apply scope
        if (config.applyTo === "ALL") {
            setApplyTo("ALL");
            setSelectedTargets([]);
        } else if (config.applyTo === "NONE") {
            setApplyTo("NONE");
            setSelectedTargets([]);
        } else if (config.applyTo === "USER") {
            setApplyTo("USER");
            const user = users.find(u => u.id === config.targetId);
            setSelectedTargets([{
                id: config.targetId,
                label: user?.employee?.fullName || user?.username || config.targetId,
                sub: user?.employee?.employeeCode || user?.email,
            }]);
        } else {
            // ROLE — could be department or role
            const dept = departments.find(d => d.id === config.targetId);
            if (dept) {
                setApplyTo("DEPARTMENT");
                setSelectedTargets([{ id: dept.id, label: dept.name, sub: dept.code }]);
            } else {
                const role = roles.find(r => r.id === config.targetId);
                if (role) {
                    setApplyTo("ROLE");
                    setSelectedTargets([{ id: role.id, label: role.name, sub: role.code }]);
                } else {
                    setApplyTo("DEPARTMENT");
                    setSelectedTargets([{ id: config.targetId, label: config.targetId }]);
                }
            }
        }
        setActiveTab("config");
        toast.info("Đã tải cấu hình — chỉnh sửa và nhấn Lưu để cập nhật");
    };

    const handleCopyConfig = async (config: any) => {
        const rawCols = config.columns as ColumnItem[];
        // Filter out obsolete columns
        const validKeys = new Set(defaultColumns.map(c => c.key));
        const savedCols = rawCols.filter(c => validKeys.has(c.key)).sort((a, b) => a.order - b.order);

        // Merge missing default columns
        const savedKeys = new Set(savedCols.map(c => c.key));
        const missingCols = defaultColumns
            .filter(dc => !savedKeys.has(dc.key))
            .map((dc, i) => ({
                key: dc.key,
                label: dc.label,
                visible: dc.defaultVisible !== false,
                order: savedCols.length + i
            }));

        const colData = [...savedCols, ...missingCols].map((col, i) => ({ ...col, order: i }));

        try {
            await upsertConfig.mutateAsync({
                moduleKey,
                columns: colData,
                applyTo: "NONE",
                targetId: generateUUID(),
                name: `${config.name || "Cấu hình"} (Bản sao)`
            });
            refetchConfigs();
            toast.success("Đã tạo bản sao cấu hình mới!");
        } catch (err: any) {
            toast.error(err?.message || "Lỗi tạo bản sao cấu hình");
        }
    };

    const addTarget = (item: { id: string; label: string; sub?: string }) => {
        setSelectedTargets(prev => [...prev, item]);
        setTargetSearch("");
        setShowDropdown(false);
    };

    const removeTarget = (id: string) => {
        setSelectedTargets(prev => prev.filter(t => t.id !== id));
    };

    const visibleCount = columns.filter(c => c.visible).length;
    const canSave = applyTo === "ALL" || applyTo === "NONE" || selectedTargets.length > 0;

    const resolveTargetName = useCallback((applyScope: string, targetId: string) => {
        if (applyScope === "ROLE") {
            const dept = departments.find(d => d.id === targetId);
            if (dept) return { name: dept.name, icon: "dept" };
            const role = roles.find(r => r.id === targetId);
            if (role) return { name: role.name, icon: "role" };
            return { name: targetId.substring(0, 8) + "...", icon: "dept" };
        }
        if (applyScope === "USER") {
            const user = users.find(u => u.id === targetId);
            if (user) return { name: user.employee?.fullName || user.username, icon: "user" };
            return { name: targetId.substring(0, 8) + "...", icon: "user" };
        }
        if (applyScope === "NONE") return { name: "Chưa gán", icon: "none" };
        return { name: "Tất cả", icon: "all" };
    }, [departments, roles, users]);

    const scopeButtons: { key: ApplyScope; label: string; icon: React.ReactNode }[] = [
        { key: "ALL", label: "Tất cả", icon: <Users className="h-3 w-3" /> },
        { key: "DEPARTMENT", label: "Phòng ban", icon: <Building2 className="h-3 w-3" /> },
        { key: "ROLE", label: "Vai trò", icon: <ShieldCheck className="h-3 w-3" /> },
        { key: "USER", label: "Người dùng", icon: <User className="h-3 w-3" /> },
        { key: "NONE", label: "Không áp dụng", icon: <CircleOff className="h-3 w-3" /> },
    ];

    const scopeSearchPlaceholder: Record<ApplyScope, string> = {
        ALL: "", DEPARTMENT: "Tìm phòng ban...", ROLE: "Tìm vai trò...", USER: "Tìm người dùng...", NONE: ""
    };

    const scopeBadgeColor: Record<ApplyScope, string> = {
        ALL: "",
        DEPARTMENT: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        ROLE: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200 dark:border-violet-800",
        USER: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        NONE: "bg-gray-50 text-gray-700 dark:bg-gray-950/50 dark:text-gray-300 border-gray-200 dark:border-gray-800",
    };

    const scopeIcon: Record<string, React.ReactNode> = {
        dept: <Building2 className="h-3 w-3 mr-0.5" />,
        role: <ShieldCheck className="h-3 w-3 mr-0.5" />,
        user: <User className="h-3 w-3 mr-0.5" />,
        all: <Users className="h-3 w-3 mr-0.5" />,
        none: <CircleOff className="h-3 w-3 mr-0.5" />,
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                showCloseButton={false}
                className="!w-[min(96vw,960px)] !max-w-none p-0 flex flex-col gap-0 overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 px-6 py-3.5 text-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                            <Columns3 className="h-5 w-5" />
                        </div>
                        <h2 className="text-white text-lg font-semibold flex-1">Cấu hình hiển thị cột</h2>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/25 transition-colors shrink-0"
                            title="Đóng"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex gap-1 mt-3 bg-white/10 rounded-lg p-1">
                        <button onClick={() => setActiveTab("config")}
                            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${activeTab === "config" ? "bg-white text-blue-700 shadow-sm" : "text-white/80 hover:text-white hover:bg-white/10"}`}>
                            Cấu hình cột {editingConfigId && <span className="ml-1 text-xs opacity-70">(đang sửa)</span>}
                        </button>
                        <button onClick={() => setActiveTab("saved")}
                            className={`flex flex-1 items-center justify-center gap-2 text-sm font-medium py-1.5 rounded-md transition-all ${activeTab === "saved" ? "bg-white text-blue-700 shadow-sm" : "text-white/80 hover:text-white hover:bg-white/10"}`}>
                            <span>Đã lưu ({savedConfigs?.length || 0})</span>
                            {activeTab === "saved" && (
                                <div
                                    title="Tải lại danh sách"
                                    onClick={(e) => { e.stopPropagation(); refetchConfigs(); }}
                                    className={`p-1 rounded-md hover:bg-white/20 transition-all cursor-pointer ${isRefetching ? "opacity-70" : ""}`}
                                >
                                    <RefreshCw className={`h-3 w-3 text-blue-500 hover:text-blue-700 transition-all ${isRefetching ? "animate-spin" : ""}`} />
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                {activeTab === "config" ? (
                    <>
                        {/* Editing indicator */}
                        {editingConfigId && (
                            <div className="px-6 py-1.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
                                <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                    <Pencil className="h-3 w-3" />
                                    Đang chỉnh sửa cấu hình đã lưu
                                </span>
                                <button
                                    onClick={() => {
                                        setEditingConfigId(null);
                                        setColumns([...allColumns].sort((a, b) => a.order - b.order));
                                        setApplyTo("ALL");
                                        setConfigName("");
                                        setSelectedTargets([]);
                                    }}
                                    className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 font-medium"
                                >
                                    Hủy sửa
                                </button>
                            </div>
                        )}

                        {/* Configuration Name and Apply scope */}
                        <div className="px-6 py-2.5 border-b bg-muted/30">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground whitespace-nowrap">
                                    <Pencil className="h-4 w-4 text-emerald-600" />
                                    Tên cấu hình:
                                </div>
                                <div className="flex-1">
                                    <Input placeholder="VD: Cấu hình bảng lương (không bắt buộc)" value={configName} onChange={e => setConfigName(e.target.value)} className="h-8 max-w-sm" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground whitespace-nowrap">
                                    <Shield className="h-4 w-4 text-blue-600" />
                                    Áp dụng:
                                </div>
                                <div className="flex gap-0.5 bg-muted rounded-lg p-0.5 flex-wrap">
                                    {scopeButtons.map(btn => (
                                        <button key={btn.key}
                                            onClick={() => { setApplyTo(btn.key); setSelectedTargets([]); setTargetSearch(""); setShowDropdown(false); }}
                                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${applyTo === btn.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                                            {btn.icon}
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {applyTo !== "ALL" && applyTo !== "NONE" && (
                                <div className="mt-2.5" data-dropdown-container>
                                    {selectedTargets.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {selectedTargets.map(target => (
                                                <Badge key={target.id} variant="secondary" className={`pl-2 pr-1 py-1 gap-0.5 border text-xs ${scopeBadgeColor[applyTo]}`}>
                                                    {scopeButtons.find(b => b.key === applyTo)?.icon}
                                                    <span className="ml-0.5">{target.label}</span>
                                                    <button onClick={() => removeTarget(target.id)} className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input placeholder={scopeSearchPlaceholder[applyTo]} value={targetSearch}
                                            onChange={(e) => { setTargetSearch(e.target.value); setShowDropdown(true); }}
                                            onFocus={() => setShowDropdown(true)} className="h-8 pl-8 pr-8 text-sm" />
                                        {applyTo === "USER" && isFetchingUsers && (
                                            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
                                        )}
                                        {showDropdown && filteredOptions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-[180px] overflow-y-auto">
                                                {filteredOptions.slice(0, 20).map(opt => (
                                                    <button key={opt.id} onClick={() => addTarget(opt)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/80 transition-colors text-left">
                                                        {scopeButtons.find(b => b.key === applyTo)?.icon}
                                                        <span className="font-medium truncate">{opt.label}</span>
                                                        {opt.sub && <span className="text-muted-foreground text-xs ml-auto font-mono flex-shrink-0">{opt.sub}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Toggle header */}
                        <div className="flex items-center justify-between px-6 py-1.5 text-xs">
                            <div className="flex items-center gap-2">
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${visibleCount === columns.length ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"}`}>
                                    <Eye className="h-3 w-3" />
                                    {visibleCount}/{columns.length}
                                </div>
                                <span className="text-muted-foreground">cột hiển thị</span>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => handleToggleAll(true)} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors font-medium">Chọn tất cả</button>
                                <span className="text-muted-foreground">•</span>
                                <button onClick={() => handleToggleAll(false)} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors font-medium">Bỏ chọn</button>
                            </div>
                        </div>

                        {/* Column list — larger area */}
                        <div className="flex-1 overflow-y-auto px-4 pb-2 max-h-[65vh]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                {columns.map((col, index) => (
                                    <div key={col.key} draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDrop={(e) => handleDrop(e, index)}
                                        className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-200 cursor-grab active:cursor-grabbing select-none border
                                            ${dragOverIndex === index ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm"
                                                : dragIndex === index ? "opacity-40 border-transparent"
                                                    : col.visible ? "border-transparent hover:bg-muted/60 hover:border-border/50"
                                                        : "border-transparent bg-muted/30 opacity-50 hover:opacity-70"}`}>
                                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors flex-shrink-0" />
                                        <div className={`flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold flex-shrink-0 ${col.visible ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" : "bg-muted text-muted-foreground"}`}>
                                            {index + 1}
                                        </div>
                                        <span className={`text-sm flex-1 truncate transition-all ${col.visible ? "font-medium text-foreground" : "text-muted-foreground line-through"}`}>
                                            {col.label}
                                        </span>
                                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 mr-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                                                disabled={index === 0}
                                                className="hover:bg-muted/80 p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                                                title="Lên trên">
                                                <ChevronUp className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                                                disabled={index === columns.length - 1}
                                                className="hover:bg-muted/80 p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                                                title="Xuống dưới">
                                                <ChevronDown className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <Switch checked={col.visible} onCheckedChange={() => handleToggleVisible(index)} className="scale-75" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-2.5 border-t bg-muted/20 flex items-center justify-between gap-3">
                            <Button variant="ghost" onClick={handleReset} className="gap-1.5 text-muted-foreground hover:text-foreground">
                                <RotateCcw className="h-3.5 w-3.5" />
                                Đặt lại mặc định
                            </Button>
                            <Button onClick={handleSave} disabled={upsertConfig.isPending || !canSave}
                                className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all px-6">
                                <Save className="h-3.5 w-3.5" />
                                {upsertConfig.isPending ? "Đang lưu..." : editingConfigId ? "Cập nhật" : "Lưu cấu hình"}
                            </Button>
                        </div>
                    </>
                ) : (
                    /* Saved configs tab */
                    <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[80vh]">
                        {!savedConfigs || savedConfigs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                                    <Columns3 className="h-8 w-8 text-muted-foreground/50" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">Chưa có cấu hình nào được lưu</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Chuyển sang tab "Cấu hình cột" để tạo mới</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSavedConfigDragEnd}>
                                    <SortableContext items={optimisticConfigs.map((c: any) => c.id)} strategy={verticalListSortingStrategy}>
                                        {optimisticConfigs.map((config: any, index: number) => {
                                            return (
                                                <SortableConfigItem
                                                    key={config.id}
                                                    config={config}
                                                    index={index}
                                                    editingConfigId={editingConfigId}
                                                    handleLoadConfig={handleLoadConfig}
                                                    handleCopyConfig={handleCopyConfig}
                                                    handleDeleteConfig={handleDeleteConfig}
                                                    defaultColumns={defaultColumns}
                                                    scopeIcon={scopeIcon}
                                                    resolveTargetName={resolveTargetName}
                                                />
                                            );
                                        })}
                                    </SortableContext>
                                </DndContext>
                            </div>
                        )}
                    </div>
                )}
            </SheetContent>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xóa cấu hình cột này?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa cấu hình này không? Dữ liệu cấu hình sẽ bị mất và những đối tượng đang sử dụng sẽ quay về giao diện mặc định. Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700 text-white">Xóa cấu hình</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Update Comparison Dialog */}
            <Dialog open={showUpdateConfirm} onOpenChange={setShowUpdateConfirm}>
                <DialogContent className="sm:max-w-[800px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogTitle className="text-lg font-semibold border-b px-6 py-4">Xác nhận lịch sử thay đổi</DialogTitle>
                    <div className="px-6 py-4 grid grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-900/50 max-h-[60vh] overflow-y-auto">
                        <div className="bg-white dark:bg-slate-950 border rounded-xl p-4 shadow-sm">
                            <Badge variant="outline" className="mb-3 bg-slate-100 dark:bg-slate-900 border-slate-200 text-slate-600">Bản cũ (Lịch sử)</Badge>
                            <div className="text-sm space-y-1">
                                {savedConfigs?.find(c => c.id === editingConfigId)?.columns.filter(c => c.visible).map((c, i) => (
                                    <div key={i} className="py-1 border-b border-dashed border-slate-100 dark:border-slate-800 last:border-0 truncate flex gap-2">
                                        <span className="text-slate-400 font-mono w-4">{i + 1}.</span>
                                        <span className="text-slate-600 dark:text-slate-400">{c.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-950 border rounded-xl border-blue-200 dark:border-blue-900 overflow-hidden shadow-sm relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                            <div className="p-4">
                                <Badge className="mb-3 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-0">Bản thay đổi</Badge>
                                <div className="text-sm space-y-1">
                                    {columns.filter(c => c.visible).map((c, i) => (
                                        <div key={i} className="py-1 border-b border-dashed border-slate-100 dark:border-slate-800 last:border-0 truncate flex gap-2">
                                            <span className="text-blue-400 font-mono w-4">{i + 1}.</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-200">{c.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/20">
                        <Button variant="ghost" onClick={() => setShowUpdateConfirm(false)}>Quay lại chỉnh sửa</Button>
                        <Button onClick={executeSave} disabled={upsertConfig.isPending} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:shadow-lg">
                            {upsertConfig.isPending ? "Đang xử lý..." : "Xác nhận cập nhật"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Sheet>
    );
}

function SortableConfigItem({ config, index, editingConfigId, handleLoadConfig, handleCopyConfig, handleDeleteConfig, defaultColumns, scopeIcon, resolveTargetName }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: config.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

    const rawCols = config.columns as ColumnItem[];
    // Filter out obsolete columns for accurate counting
    const validKeysDef = new Set(defaultColumns.map((c: any) => c.key));
    const cols = rawCols.filter(c => validKeysDef.has(c.key));

    const savedKeys = new Set(cols.map(c => c.key));
    const missingCols = defaultColumns.filter((dc: any) => !savedKeys.has(dc.key));
    const totalLength = cols.length + missingCols.length;
    const visCount = cols.filter(c => c.visible).length + missingCols.filter((c: any) => c.defaultVisible !== false).length;

    const resolved = config.applyTo === "ALL"
        ? { name: "Tất cả", icon: "all" }
        : resolveTargetName(config.applyTo, config.targetId || "");

    return (
        <div ref={setNodeRef} style={style}
            className={`group border rounded-xl p-3.5 transition-all cursor-pointer hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 max-w-full ${editingConfigId === config.id ? "border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30" : ""} ${isDragging ? "shadow-md z-10 scale-[1.02] border-blue-500" : ""}`}
            onClick={(e) => {
                if ((e.target as HTMLElement).closest('.config-actions')) return;
                handleLoadConfig(config);
            }}
        >
            <div className="flex items-start justify-between gap-3 relative">
                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`border-0 gap-1 text-xs whitespace-nowrap ${config.applyTo === "ALL"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                            : resolved.icon === "none"
                                ? "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400"
                                : resolved.icon === "user"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                                    : resolved.icon === "role"
                                        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                            }`}>
                            {scopeIcon[resolved.icon as keyof typeof scopeIcon]}
                            {resolved.name}
                        </Badge>
                        {config.name && (
                            <span className="text-sm font-medium ml-1 text-foreground/90 truncate max-w-[150px] inline-block">{config.name}</span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                            <Eye className="h-3 w-3" />
                            {visCount}/{totalLength}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                        {config.createdAt && (
                            <span className="flex items-center gap-1">
                                <span className="font-medium">Tạo:</span> {new Date(config.createdAt).toLocaleDateString("vi-VN")} {config.createdBy?.username ? `- ${config.createdBy.username}` : ""}
                            </span>
                        )}
                        {config.updatedAt && (
                            <span className="flex items-center gap-1 bg-muted/30 px-1 rounded">
                                <span className="font-medium">Sửa:</span> {new Date(config.updatedAt).toLocaleDateString("vi-VN")} {config.updatedBy?.username ? `- ${config.updatedBy.username}` : ""}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2.5">
                        {cols.sort((a, b) => a.order - b.order).slice(0, 10).map(col => (
                            <span key={col.key}
                                className={`text-[10px] px-1.5 py-0.5 rounded ${col.visible ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400" : "bg-muted text-muted-foreground line-through"}`}>
                                {col.label}
                            </span>
                        ))}
                        {cols.length > 10 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">+{cols.length - 10}</span>}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-1 shrink-0 transition-opacity config-actions sm:opacity-0 sm:group-hover:opacity-100 absolute top-0 right-0 h-full justify-center sm:relative sm:top-auto sm:right-auto bg-background/90 sm:bg-transparent px-2 sm:px-0 rounded-l-md sm:rounded-none">
                    <button {...attributes} {...listeners} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-muted mr-1 touch-none">
                        <GripVertical className="h-4 w-4" />
                    </button>
                    <div className="w-[1px] h-6 bg-muted mx-1 hidden sm:block"></div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyConfig(config); }}
                        title="Sao chép">
                        <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLoadConfig(config); }}
                        title="Chỉnh sửa">
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteConfig(config.id); }}
                        title="Xóa">
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
