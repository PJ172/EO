"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useEmployees } from "@/services/employee.service";
import { useDepartments } from "@/services/department.service";
import { useRoles } from "@/services/role.service";
import { useUsers } from "@/services/users.service";
import {
    Monitor, Users, CalendarDays, Briefcase,
    FolderKanban, FileText, BarChart3, UtensilsCrossed,
    DoorOpen, Headphones, Loader2, ArrowLeft,
    ShieldCheck, Info, RotateCcw, History, Trash2,
    LayoutList, Save, CheckCircle2, XCircle, Settings2,
    Calendar, User as UserIcon, Clock
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
    useAllModuleConfigs,
    useBulkUpdateVisibility,
    useDeleteModuleConfig,
    ModuleVisibilityPreset
} from "@/services/module-visibility.service";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const MODULES_CONFIG = [
    { code: "ORGCHART", title: "Sơ đồ tổ chức", description: "Hiển thị sơ đồ cấu trúc công ty", icon: FolderKanban, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { code: "EMPLOYEES", title: "Quản lý Nhân sự", description: "Danh sách và hồ sơ nhân viên", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { code: "TIMEKEEPING", title: "Chấm công & Phân ca", description: "Dữ liệu chấm công, tăng ca", icon: CalendarDays, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { code: "KPI", title: "Quản lý KPI", description: "Đánh giá mục tiêu và hiệu suất", icon: Briefcase, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { code: "LEAVE", title: "Quản lý Nghỉ phép", description: "Đăng ký và duyệt nghỉ phép", icon: CalendarDays, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20" },
    { code: "REQUESTS", title: "Tờ trình điện tử", description: "Hệ thống trình ký phê duyệt", icon: FileText, color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-900/20" },
    { code: "DOCUMENTS", title: "Quản lý Văn bản", description: "Kho lưu trữ tài liệu đơn vị", icon: FileText, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
    { code: "NEWS", title: "Truyền thông nội bộ", description: "Thông báo và tin tức công ty", icon: FileText, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
    { code: "BOOKINGS", title: "Đặt phòng & Tài sản", description: "Đặt phòng họp và thiết bị", icon: DoorOpen, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { code: "CARS", title: "Quản lý Đội xe", description: "Điều phối xe công tác", icon: Briefcase, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-900/20" },
    { code: "MEALS", title: "Quản lý Suất ăn", description: "Đăng ký suất ăn công nghiệp", icon: UtensilsCrossed, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
    { code: "IT_ASSETS", title: "Quản lý Thiết bị IT", description: "Quản lý tài sản công nghệ", icon: Monitor, color: "text-blue-700", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { code: "TICKETS", title: "Hỗ trợ Kỹ thuật", description: "Yêu cầu hỗ trợ IT nội bộ", icon: Headphones, color: "text-indigo-700", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { code: "PROJECTS", title: "Quản lý Dự án", description: "Theo dõi tiến trình dự án", icon: FolderKanban, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
    { code: "TASKS", title: "Quản lý Công việc", description: "Giao việc và báo cáo tiến độ", icon: Briefcase, color: "text-fuchsia-600", bg: "bg-fuchsia-50 dark:bg-fuchsia-900/20" },
    { code: "REPORTS", title: "Hệ thống Báo cáo", description: "Thống kê và phân tích dữ liệu", icon: BarChart3, color: "text-slate-700", bg: "bg-slate-50 dark:bg-slate-900/20" },
];

// Memoized Module Card Component to prevent unnecessary re-renders during input
const ModuleCard = React.memo(({
    module,
    isVisible,
    onToggle
}: {
    module: any;
    isVisible: boolean;
    onToggle: (code: string) => void;
}) => {
    return (
        <div
            onClick={() => onToggle(module.code)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer group flex items-start justify-between shadow-sm hover:translate-y-[-2px] will-change-transform ${isVisible
                ? "bg-card border-indigo-600/20 ring-1 ring-indigo-500/5 shadow-indigo-500/5 hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-600/40"
                : "bg-muted/10 border-dashed border-muted-foreground/10 opacity-60 grayscale hover:grayscale-0"
                }`}
        >
            <div className="flex gap-4">
                <div className={`h-11 w-11 rounded-1.5xl flex items-center justify-center transition-all ${isVisible ? module.bg : "bg-muted"}`}>
                    <module.icon className={`h-5 w-5 ${isVisible ? module.color : "text-muted-foreground"}`} />
                </div>
                <div className="space-y-1.5 pr-2">
                    <h4 className="text-base font-bold tracking-tight leading-none">{module.title}</h4>
                    <p className="text-xs text-muted-foreground leading-tight font-medium opacity-70 line-clamp-2 mt-1">{module.description}</p>
                </div>
            </div>
            <Switch
                checked={isVisible}
                onCheckedChange={() => onToggle(module.code)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 data-[state=checked]:bg-emerald-500"
            />
        </div>
    );
});
ModuleCard.displayName = "ModuleCard";

export default function AppearanceSettingsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("config");

    // Admin State
    const [configName, setConfigName] = useState("");
    const [adminTargetType, setAdminTargetType] = useState<string>("GLOBAL");
    const [selectedTargets, setSelectedTargets] = useState<{ id: string; label: string; sub?: string }[]>([]);
    const [targetSearch, setTargetSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(targetSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [targetSearch]);

    // Internal Column-like state for modules
    const [localConfigs, setLocalConfigs] = useState<{ moduleCode: string; isVisible: boolean }[]>(
        MODULES_CONFIG.map(m => ({ moduleCode: m.code, isVisible: true }))
    );

    const isAdmin = user?.roles?.includes('ADMIN');

    // Hooks
    const { data: savedConfigs, refetch: refetchHistory, isLoading: loadingHistory } = useAllModuleConfigs();
    const bulkMutation = useBulkUpdateVisibility();
    const deleteMutation = useDeleteModuleConfig();
    const { data: usersData, isLoading: loadingUsers } = useUsers({ search: debouncedSearch, limit: 20 });
    const { data: departmentsData } = useDepartments({ search: debouncedSearch, limit: 20 });
    const { data: rolesData } = useRoles();

    // Target processing
    const filteredOptions = useMemo(() => {
        const search = targetSearch.toLowerCase();
        const selectedIds = new Set(selectedTargets.map(t => t.id));

        if (adminTargetType === 'USER') {
            return (usersData?.data || [])
                .filter(u => !selectedIds.has(u.id))
                .filter(u => !search ||
                    u.username.toLowerCase().includes(search) ||
                    u.employee?.fullName.toLowerCase().includes(search)
                )
                .map(u => ({
                    id: u.id,
                    label: u.employee?.fullName || u.username,
                    sub: u.employee?.fullName ? u.username : 'Hệ thống'
                }));
        }
        if (adminTargetType === 'DEPT') {
            return (departmentsData?.data || [])
                .filter(dept => !selectedIds.has(dept.id))
                .filter(dept => !search || dept.name.toLowerCase().includes(search))
                .map(dept => ({ id: dept.id, label: dept.name, sub: dept.code }));
        }
        if (adminTargetType === 'ROLE') {
            return (rolesData || [])
                .filter(role => !selectedIds.has(role.id))
                .filter(role => !search || role.name.toLowerCase().includes(search))
                .map(role => ({ id: role.id, label: role.name, sub: role.code }));
        }
        return [];
    }, [adminTargetType, usersData, departmentsData, rolesData, targetSearch, selectedTargets]);

    const handleToggleModule = React.useCallback((code: string) => {
        setLocalConfigs(prev => prev.map(c => c.moduleCode === code ? { ...c, isVisible: !c.isVisible } : c));
    }, []);

    const handleSave = React.useCallback(async () => {
        if (adminTargetType !== 'GLOBAL' && selectedTargets.length === 0) {
            toast.error("Vui lòng chọn ít nhất một đối tượng áp dụng");
            return;
        }

        try {
            if (adminTargetType === 'GLOBAL') {
                await bulkMutation.mutateAsync({
                    targetType: 'GLOBAL',
                    targetId: null,
                    configs: localConfigs,
                    name: configName || "Cấu hình toàn hệ thống"
                });
            } else {
                const promises = selectedTargets.map(target =>
                    bulkMutation.mutateAsync({
                        targetType: adminTargetType,
                        targetId: target.id,
                        configs: localConfigs,
                        name: configName || `Cấu hình cho ${target.label}`
                    })
                );
                await Promise.all(promises);
            }
            toast.success("Đã áp dụng cấu hình thành công!");
            refetchHistory();
        } catch (error) {
            toast.error("Lỗi khi lưu cấu hình hiển thị");
        }
    }, [adminTargetType, selectedTargets, localConfigs, configName, bulkMutation, refetchHistory]);

    const handleLoadPreset = React.useCallback((preset: ModuleVisibilityPreset) => {
        setLocalConfigs(MODULES_CONFIG.map(m => {
            const found = preset.modules.find(pm => pm.moduleCode === m.code);
            return { moduleCode: m.code, isVisible: found ? found.isVisible : true };
        }));
        setAdminTargetType(preset.targetType);
        setConfigName(preset.name || "");

        // Tự động tìm lại thông tin đối tượng dựa trên ID
        if (preset.targetType !== 'GLOBAL' && preset.targetId) {
            let label = preset.targetId;
            let sub = "";

            if (preset.targetType === 'USER') {
                const found = usersData?.data?.find(u => u.id === preset.targetId);
                if (found) {
                    label = found.employee?.fullName || found.username;
                    sub = found.employee?.fullName ? found.username : 'Hệ thống';
                } else if (preset.name) {
                    label = preset.name;
                }
            } else if (preset.targetType === 'DEPT') {
                const found = departmentsData?.data?.find(d => d.id === preset.targetId);
                if (found) {
                    label = found.name;
                    sub = found.code;
                }
            } else if (preset.targetType === 'ROLE') {
                const found = rolesData?.find(r => r.id === preset.targetId);
                if (found) {
                    label = found.name;
                    sub = found.code;
                }
            }
            setSelectedTargets([{ id: preset.targetId, label, sub }]);
        } else {
            setSelectedTargets([]);
        }

        setActiveTab("config");
        toast.info("Đã nạp toàn bộ dữ liệu cấu hình cũ!");
    }, [usersData, departmentsData, rolesData]);

    const handleDeletePreset = React.useCallback(async (preset: ModuleVisibilityPreset) => {
        if (confirm(`Bạn có chắc chắn muốn xóa cấu hình cho ${preset.name || preset.targetId}?`)) {
            try {
                await deleteMutation.mutateAsync({ targetType: preset.targetType, targetId: preset.targetId });
                toast.success("Đã xóa cấu hình");
            } catch (error) {
                toast.error("Lỗi khi xóa cấu hình");
            }
        }
    }, [deleteMutation]);

    const handleReset = React.useCallback(() => {
        setLocalConfigs(MODULES_CONFIG.map(m => ({ moduleCode: m.code, isVisible: true })));
        setConfigName("");
        setSelectedTargets([]);
        toast.info("Đã đặt lại về mặc định");
    }, []);

    const getTargetBadgeColor = (type: string) => {
        switch (type) {
            case 'GLOBAL': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'USER': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
            case 'DEPT': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            case 'ROLE': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
            default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
        }
    };

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background">
                <ShieldCheck className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold">Truy cập bị từ chối</h2>
                <p className="text-muted-foreground">Chỉ quản trị viên mới có quyền truy cập trang này.</p>
                <Button variant="link" onClick={() => router.push('/')}>Trở về trang chủ</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden p-2 space-y-2 relative">
            {/* Premium Mesh Gradient Background Layer */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse" />
                <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] rounded-full bg-blue-500/10 blur-[100px]" />
                <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px]" />
            </div>

            <div className="relative z-10 bg-card/60 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-xl shadow-indigo-500/5 rounded-2xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <PageHeader
                    title="Cấu hình hiển thị Module"
                    backHref="/settings"
                    icon={
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-blue-600 to-indigo-700">
                            <Monitor className="h-5 w-5 text-white" />
                        </div>
                    }
                    className="mb-0 border-none bg-transparent p-0 shadow-none"
                    onRefresh={refetchHistory}
                    isRefreshing={loadingHistory}
                >
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            className="h-[33px] border-dashed font-semibold tracking-wide text-sm"
                        >
                            <RotateCcw className="mr-2 h-4 w-4" /> Đặt lại
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={bulkMutation.isPending}
                            className="h-[33px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold tracking-wide text-sm px-6 shadow-md shadow-indigo-500/20 transition-all hover:translate-y-[-1px]"
                        >
                            {bulkMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Lưu cấu hình
                        </Button>
                    </div>
                </PageHeader>
            </div>

            <div className="relative z-10 flex-1 flex flex-col min-h-0 bg-card/30 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/5">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="px-6 py-4 border-b border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20">
                        <TabsList className="bg-muted/50 p-1 w-full sm:w-auto">
                            <TabsTrigger value="config" className="flex items-center gap-2 px-8 py-2 font-semibold text-sm">
                                <LayoutList className="h-4 w-4" /> Thiết lập
                            </TabsTrigger>
                            <TabsTrigger value="saved" className="flex items-center gap-2 px-8 py-2 font-semibold text-sm">
                                <History className="h-4 w-4" /> Đã lưu ({savedConfigs?.length || 0})
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === 'config' && (
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setLocalConfigs(prev => prev.map(c => ({ ...c, isVisible: true })))}
                                    className="h-8 text-[11px] font-bold tracking-widest bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none transition-all"
                                >
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> BẬT TẤT CẢ
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setLocalConfigs(prev => prev.map(c => ({ ...c, isVisible: false })))}
                                    className="h-8 text-[11px] font-bold tracking-widest bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-none transition-all"
                                >
                                    <XCircle className="mr-1.5 h-3.5 w-3.5" /> TẮT TẤT CẢ
                                </Button>
                            </div>
                        )}
                    </div>

                    <TabsContent value="config" className="flex-1 overflow-y-auto p-2 space-y-2 m-0 outline-none animate-in fade-in duration-300">
                        {/* Admin Controls Area */}
                        <div className="grid lg:grid-cols-2 gap-6 items-start">
                            {/* Column 1: Config Info & Targets */}
                            <div className="bg-muted/40 backdrop-blur-md p-5 rounded-3xl border border-border/50 space-y-4 shadow-inner">
                                <div className="space-y-2">
                                    <Label className="text-[14px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <FileText className="h-3.5 w-3.5" /> Tên cấu hình (Tùy chọn)
                                    </Label>
                                    <Input
                                        placeholder="VD: Giao diện Khối Văn Phòng..."
                                        value={configName}
                                        onChange={e => setConfigName(e.target.value)}
                                        className="h-11 rounded-xl bg-background border-border/60 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[14px] font-black uppercase tracking-widest text-muted-foreground">Phạm vi đối tượng áp dụng</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[
                                            { id: 'GLOBAL', label: 'Tất cả', desc: 'Hệ thống', icon: Users },
                                            { id: 'ROLE', label: 'Vai trò', desc: 'Nhóm quyền', icon: ShieldCheck },
                                            { id: 'DEPT', label: 'Phòng ban', desc: 'Đơn vị', icon: BarChart3 },
                                            { id: 'USER', label: 'Người dùng', desc: 'Cá nhân', icon: UserIcon },
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => { setAdminTargetType(item.id); setSelectedTargets([]); }}
                                                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${adminTargetType === item.id
                                                    ? "bg-indigo-600/5 dark:bg-indigo-500/10 border-indigo-600 shadow-sm"
                                                    : "bg-background border-transparent hover:border-border"
                                                    }`}
                                            >
                                                <item.icon className={`h-5 w-5 mb-1.5 ${adminTargetType === item.id ? "text-indigo-600" : "text-muted-foreground"}`} />
                                                <span className={`text-[14px] font-bold ${adminTargetType === item.id ? "text-indigo-600" : "text-slate-900 dark:text-slate-100"}`}>{item.label}</span>
                                                <span className="text-[12px] text-muted-foreground opacity-60 font-medium tracking-tight">{item.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Selection / Info */}
                            <div className="bg-card/80 backdrop-blur-xl p-5 rounded-3xl border border-white/20 dark:border-white/5 h-full min-h-[220px] shadow-sm">
                                {adminTargetType !== 'GLOBAL' ? (
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Chọn danh sách cụ thể</Label>
                                        <div className="relative">
                                            <Input
                                                placeholder={`Tìm kiếm ${adminTargetType === 'USER' ? 'Người dùng' : adminTargetType === 'ROLE' ? 'Vai trò' : 'Phòng ban'}...`}
                                                value={targetSearch}
                                                onChange={e => { setTargetSearch(e.target.value); setShowDropdown(true); }}
                                                onFocus={() => setShowDropdown(true)}
                                                className="h-11 rounded-xl pr-10 bg-muted/20 font-medium"
                                            />
                                            {showDropdown && (
                                                <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto bg-card border border-border rounded-xl shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-200">
                                                    {(loadingUsers || loadingHistory) ? (
                                                        <div className="p-4 text-center">
                                                            <div className="h-5 w-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                                                            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Đang tìm kiếm...</span>
                                                        </div>
                                                    ) : filteredOptions.length > 0 ? (
                                                        filteredOptions.map(opt => (
                                                            <button
                                                                key={opt.id}
                                                                className="flex flex-col w-full text-left px-4 py-2 hover:bg-muted rounded-lg transition-colors border-b border-border/30 last:border-none"
                                                                onClick={() => {
                                                                    setSelectedTargets(prev => [...prev, opt]);
                                                                    setTargetSearch("");
                                                                    setShowDropdown(false);
                                                                }}
                                                            >
                                                                <span className="text-sm font-bold">{opt.label}</span>
                                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{opt.sub}</span>
                                                            </button>
                                                        ))
                                                    ) : targetSearch.trim() !== "" ? (
                                                        <div className="p-4 text-center text-muted-foreground italic text-[11px] font-medium">
                                                            Không tìm thấy kết quả phù hợp cho "{targetSearch}"
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 text-center text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-40">
                                                            Hãy nhập từ khóa để tìm kiếm...
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto">
                                            {selectedTargets.length === 0 ? (
                                                <div className="py-8 w-full text-center border-2 border-dashed border-muted rounded-xl text-muted-foreground/40 text-[11px] font-bold uppercase tracking-widest">
                                                    Chưa có đối tượng nào được chọn
                                                </div>
                                            ) : (
                                                selectedTargets.map(t => (
                                                    <Badge
                                                        key={t.id}
                                                        className="bg-indigo-600/10 text-indigo-700 hover:bg-indigo-600/20 border-none transition-all py-1.5 pl-3 pr-2 flex items-center gap-2 group"
                                                    >
                                                        <span className="font-bold text-[11px] uppercase tracking-tight">{t.label}</span>
                                                        <button onClick={() => setSelectedTargets(prev => prev.filter(st => st.id !== t.id))} className="text-indigo-400 group-hover:text-indigo-700">
                                                            <XCircle className="h-4 w-4" />
                                                        </button>
                                                    </Badge>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col justify-center items-center text-center p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-2xl border border-emerald-500/20 shadow-inner">
                                        <div className="h-16 w-16 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6 animate-pulse border-2 border-white/20">
                                            <ShieldCheck className="h-9 w-9 text-white" />
                                        </div>
                                        <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-100 uppercase tracking-widest mb-2">Chế độ Phủ sóng Toàn bộ</h4>
                                        <p className="text-xs text-emerald-700/70 dark:text-emerald-400/60 leading-relaxed font-semibold uppercase tracking-tight max-w-[300px]">
                                             Cấu hình này sẽ được áp dụng làm giá trị mặc định cho toàn bộ người dùng trong hệ thống.
                                         </p>
                                     </div>
                                )}
                            </div>
                        </div>

                        {/* Modules Switcher Area */}
                        <div className="space-y-4 pt-4 border-t border-border/50">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold tracking-tight flex items-center gap-3">
                                        <Settings2 className="h-5 w-5 text-indigo-600" />
                                        Danh sách module giao diện
                                        <Badge className="bg-emerald-500 text-white border-none text-[12px] font-bold h-5 px-3 ml-2">
                                            {localConfigs.filter(c => c.isVisible).length}/{MODULES_CONFIG.length} ĐANG HIỆN
                                        </Badge>
                                    </h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 pb-10">
                                {MODULES_CONFIG.map(m => (
                                    <ModuleCard
                                        key={m.code}
                                        module={m}
                                        isVisible={localConfigs.find(c => c.moduleCode === m.code)?.isVisible ?? true}
                                        onToggle={handleToggleModule}
                                    />
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="saved" className="flex-1 overflow-y-auto p-2 m-0 outline-none bg-muted/10 animate-in fade-in duration-300">
                        {activeTab === 'saved' && (
                            <>
                                {loadingHistory ? (
                                    <div className="flex flex-col items-center justify-center h-64">
                                        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-6 drop-shadow-md" />
                                        <p className="text-sm text-muted-foreground font-semibold tracking-widest animate-pulse">Đang nạp hệ thống cấu hình...</p>
                                    </div>
                                ) : !savedConfigs || savedConfigs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-80 text-center space-y-2">
                                        <div className="h-24 w-24 bg-card rounded-full flex items-center justify-center border-4 border-dashed border-muted shadow-inner">
                                            <History className="h-10 w-10 text-muted-foreground/20" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-bold uppercase tracking-widest">Kho dữ liệu cấu hình trống</h3>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase max-w-xs mx-auto opacity-60">Hãy bắt đầu tạo cấu hình đầu tiên cho hệ thống của bạn.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        {savedConfigs.map((preset, idx) => {
                                            const visibleModules = preset.modules.filter(m => m.isVisible);
                                            const visibleCount = visibleModules.length;
                                            const totalCount = MODULES_CONFIG.length;
                                            const enabledNames = visibleModules.map(vm => MODULES_CONFIG.find(m => m.code === vm.moduleCode)?.title).filter(Boolean);

                                            return (
                                                 <Card key={idx} className="bg-card/80 backdrop-blur-md border border-white/20 dark:border-white/5 shadow-lg hover:shadow-2xl hover:translate-y-[-4px] transition-all duration-500 group overflow-hidden border-l-[6px] relative ring-1 ring-black/5" style={{ borderLeftColor: preset.targetType === 'GLOBAL' ? '#10b981' : preset.targetType === 'USER' ? '#3b82f6' : preset.targetType === 'DEPT' ? '#f59e0b' : '#8b5cf6' }}>
                                                     <div className="absolute top-0 right-0 p-0 opacity-[0.03] group-hover:opacity-10 transition-opacity rotate-12 translate-x-4 -translate-y-4">
                                                         <Settings2 className="h-24 w-24" />
                                                     </div>

                                                    <CardHeader className="p-2 pb-0">
                                                        <div className="flex justify-between items-start mb-0">
                                                            <Badge className={`border-none font-bold text-[12px] px-2 py-0.5 uppercase tracking-widest ${getTargetBadgeColor(preset.targetType)}`}>
                                                                {preset.targetType === 'GLOBAL' ? 'Tất cả' : preset.targetType === 'USER' ? 'Cá nhân' : preset.targetType === 'DEPT' ? 'Phòng ban' : 'Vai trò'}
                                                            </Badge>
                                                            <div className="flex items-center text-[12px] text-muted-foreground font-semibold tracking-tight gap-1.5 opacity-60">
                                                                <Calendar className="h-3 w-3" />
                                                                {format(new Date(preset.updatedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                                            </div>
                                                        </div>
                                                        <CardTitle className="text-base font-bold tracking-tight line-clamp-1 mb-0 text-slate-800 dark:text-slate-200">{preset.name || "Cấu hình chuẩn"}</CardTitle>
                                                        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-muted-foreground opacity-50">
                                                            <Info className="h-3 w-3" /> {preset.targetId || 'GLOBAL Scope'}
                                                        </div>
                                                    </CardHeader>

                                                    <CardContent className="p-2 pt-2 space-y-2 relative z-10">
                                                        {/* Audit Area */}
                                                        <div className="bg-muted/40 rounded-xl p-2 border border-border/30 space-y-2">
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                                                                    <span className="flex items-center gap-1.5 text-indigo-600"><Monitor className="h-3 w-3" /> Tỷ lệ hiển thị</span>
                                                                    <span className={visibleCount === totalCount ? "text-emerald-600" : "text-amber-500 font-bold"}>
                                                                        {visibleCount}/{totalCount} MODULES
                                                                    </span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-background/50 rounded-full overflow-hidden flex">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-700"
                                                                        style={{ width: `${(visibleCount / totalCount) * 100}%` }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Module Audit Tooltip-like Area */}
                                                            {enabledNames.length > 0 && (
                                                                <div className="pt-2 border-t border-border/20">
                                                                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5 flex items-center gap-1.5">
                                                                        <LayoutList className="h-2.5 w-2.5" /> Module được bật
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1 max-h-[44px] overflow-hidden relative">
                                                                        {enabledNames.map((n, i) => (
                                                                            <span key={i} className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-background/80 px-1.5 py-0.5 rounded border border-border/30 tracking-tight">
                                                                                {n}
                                                                            </span>
                                                                        ))}
                                                                        {visibleCount > 5 && <span className="text-[10px] font-bold text-indigo-500 ml-1">...và {visibleCount - 5} nữa</span>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Meta Audit */}
                                                        <div className="grid grid-cols-2 gap-4 border-y border-border/20 py-2">
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                                                                    <UserIcon className="h-2.5 w-2.5" /> Người thực hiện
                                                                </span>
                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase truncate">
                                                                    {preset.updatedBy?.employee?.fullName || preset.updatedBy?.username || 'System Admin'}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-1 border-l border-border/10 pl-3 text-right">
                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center justify-end gap-1">
                                                                    <Clock className="h-2.5 w-2.5" /> Cập nhật cuối
                                                                </span>
                                                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                                                                    {format(new Date(preset.updatedAt), 'HH:mm - dd/MM/yyyy')}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2 pt-0">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex-1 rounded-xl h-11 border-indigo-600/20 text-indigo-700 font-bold uppercase text-[11px] tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-md hover:shadow-indigo-500/20 active:scale-95 group/btn"
                                                                onClick={() => handleLoadPreset(preset)}
                                                            >
                                                                <RotateCcw className="mr-2 h-4 w-4 group-hover/btn:rotate-[-180deg] transition-transform duration-500" /> Điều chỉnh
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-11 w-11 shrink-0 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 rounded-xl transition-colors border border-transparent hover:border-rose-500/20"
                                                                onClick={() => handleDeletePreset(preset)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
