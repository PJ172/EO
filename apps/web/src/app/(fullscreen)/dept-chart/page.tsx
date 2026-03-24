'use client';

import { useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Network, Loader2, Users, Lock, Unlock } from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import OrgChartCanvas from '@/components/org-chart/org-chart-canvas';
import { cn } from '@/lib/utils';

// ─── Fetch helpers ────────────────────────────────────────────────────────────
const fetchAllDepts = () =>
    apiGet<{ data: { id: string; name: string; code: string }[] }>('/organization', {
        limit: 500,
        status: 'ACTIVE',
        showOnOrgChart: true,
    } as any);

const fetchDeptOrgChart = (deptId: string) =>
    apiGet<{ departmentInfo: any; nodes: any[]; edges: any[] }>(
        `/employees/org-chart/dept/${deptId}`
    );

// ─── Inner component (needs useSearchParams inside Suspense) ──────────────────
function DeptChartContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const paramDeptId = searchParams.get('deptId') ?? '';

    const [selectedDeptId, setSelectedDeptId] = useState<string>(paramDeptId);
    const [isLocked, setIsLocked] = useState(true);
    const canvasRef = useRef<any>(null);

    // All departments for dropdown
    const { data: deptsData, isLoading: deptsLoading } = useQuery({
        queryKey: ['depts-for-selector'],
        queryFn: fetchAllDepts,
        staleTime: Infinity,
        gcTime: Infinity,
        refetchInterval: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        placeholderData: (prev) => prev,
    });

    const departments = deptsData?.data ?? [];

    // Org chart data for selected dept
    const { data: chartData, isLoading: chartLoading, isError } = useQuery({
        queryKey: ['dept-org-chart', selectedDeptId],
        queryFn: () => fetchDeptOrgChart(selectedDeptId),
        enabled: !!selectedDeptId,
        staleTime: Infinity,
        gcTime: Infinity,
        refetchInterval: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        placeholderData: (prev) => prev,
    });

    // Global config for colors/dims
    const { data: globalConfig } = useQuery({
        queryKey: ['org-chart-config'],
        queryFn: () => apiGet<any>('/employees/org-chart/config'),
        staleTime: Infinity,
        gcTime: Infinity,
        refetchInterval: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        placeholderData: (prev) => prev,
    });

    const deptInfo = chartData?.departmentInfo;
    const selectedDept = departments.find(d => d.id === selectedDeptId);

    const handleDeptChange = (deptId: string) => {
        setSelectedDeptId(deptId);
        router.replace(`/dept-chart?deptId=${deptId}`, { scroll: false });
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
            {/* ── Topbar ── */}
            <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-slate-900/80 backdrop-blur shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10 gap-1.5"
                    onClick={() => router.push('/org-chart')}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Sơ đồ Công ty
                </Button>

                <span className="text-white/30">/</span>

                <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">
                        Sơ đồ Nhân sự
                    </span>
                    {selectedDept && (
                        <>
                            <span className="text-white/30">&mdash;</span>
                            <span className="text-emerald-400 text-sm font-bold">{selectedDept.name}</span>
                        </>
                    )}
                </div>

                {/* Department selector */}
                <div className="ml-auto flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        title={isLocked ? "Mở khóa chỉnh sửa" : "Khóa lại"}
                        onClick={() => setIsLocked(v => !v)}
                        className={cn(
                            "h-8 w-8 p-0 rounded-lg transition-all",
                            isLocked
                                ? "text-white/40 hover:text-white hover:bg-white/10"
                                : "text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25"
                        )}
                    >
                        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </Button>
                    <div className="w-72">
                    <Select
                        value={selectedDeptId}
                        onValueChange={handleDeptChange}
                        disabled={deptsLoading}
                    >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm h-8 focus:ring-emerald-500">
                            <SelectValue placeholder={deptsLoading ? 'Đang tải...' : 'Chọn phòng ban...'} />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-white/20 text-white max-h-80">
                            {departments.map(d => (
                                <SelectItem key={d.id} value={d.id} className="focus:bg-emerald-600/40">
                                    {d.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    </div>
                </div>
            </header>

            {/* ── Stats strip ── */}
            {deptInfo && (
                <div className="flex items-center gap-6 px-6 py-2 bg-slate-900/50 border-b border-white/5 text-xs text-white/50 shrink-0">
                    <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <strong className="text-white/80">{(chartData?.nodes ?? []).length}</strong> nhân viên
                    </span>
                    {deptInfo.manager && (
                        <span>
                            Trưởng phòng: <strong className="text-white/80">{deptInfo.manager.fullName}</strong>
                        </span>
                    )}
                    <span>
                        Mã: <strong className="text-white/80">{deptInfo.code}</strong>
                    </span>
                </div>
            )}

            {/* ── Canvas area ── */}
            <div className="flex-1 relative">
                {!selectedDeptId && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/30">
                        <Network className="w-16 h-16 opacity-20" />
                        <p className="text-lg font-medium">Chọn phòng ban để xem sơ đồ nhân sự</p>
                    </div>
                )}

                {selectedDeptId && chartLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                    </div>
                )}

                {selectedDeptId && isError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-rose-400">
                        <p className="font-semibold">Lỗi tải dữ liệu sơ đồ</p>
                        <p className="text-xs text-white/40">Vui lòng thử lại hoặc chọn phòng ban khác</p>
                    </div>
                )}

                {selectedDeptId && !chartLoading && chartData && (
                    <ReactFlowProvider>
                        <OrgChartCanvas
                            apiData={{ nodes: chartData.nodes, edges: chartData.edges }}
                            isLoading={false}
                            isLocked={isLocked}
                            ref={canvasRef}
                        />
                    </ReactFlowProvider>
                )}
            </div>
        </div>
    );
}

// ─── Page wrapper (Suspense required for useSearchParams in Next.js 13+) ──────
export default function DeptChartPage() {
    return (
        <Suspense fallback={
            <div className="h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
        }>
            <DeptChartContent />
        </Suspense>
    );
}
