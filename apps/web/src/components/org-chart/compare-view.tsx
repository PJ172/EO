'use client';
import { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { X, GitCompare, ArrowRight, Plus, Minus, MoveRight, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeSnapshotDiff, type DiffResult, type ConfigChange } from './services/snapshot-diff';
import { type OrgChartVersionSummary, useOrgChartVersions } from './hooks/use-org-chart-versions';
import { apiClient } from '@/lib/api-client';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface CompareViewProps {
    isOpen: boolean;
    onClose: () => void;
    chartKey: string;
}

// ─────────────────────────────────────────────────────────────
// Config Change Row
// ─────────────────────────────────────────────────────────────
const ConfigChangeRow = memo(function ConfigChangeRow({ change }: { change: ConfigChange }) {
    const formatValue = (v: any) => {
        if (v === null || v === undefined) return '—';
        if (typeof v === 'object') return JSON.stringify(v).slice(0, 60) + '...';
        return String(v);
    };

    return (
        <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors">
            <span className="text-[11px] font-medium text-slate-600 w-28 shrink-0">{change.label}</span>
            <span className="text-[11px] font-mono text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded line-through">
                {formatValue(change.before)}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
            <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                {formatValue(change.after)}
            </span>
        </div>
    );
});

// ─────────────────────────────────────────────────────────────
// Diff Summary Card
// ─────────────────────────────────────────────────────────────
const DiffSummaryCard = memo(function DiffSummaryCard({ diff }: { diff: DiffResult }) {
    if (!diff.hasDifferences) {
        return (
            <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <GitCompare className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600">Giống nhau hoàn toàn</p>
                <p className="text-[11px] text-slate-400 mt-1">Hai phiên bản không có sự khác biệt</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60">
                <GitCompare className="w-4 h-4 text-amber-600" />
                <span className="text-[11px] font-semibold text-amber-800">{diff.summary}</span>
            </div>

            {/* Config Changes */}
            {diff.configChanges.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Cấu hình thay đổi ({diff.configChanges.length})
                        </span>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                        {diff.configChanges.map((c, i) => (
                            <ConfigChangeRow key={i} change={c} />
                        ))}
                    </div>
                </div>
            )}

            {/* Overrides Added */}
            {diff.overridesAdded.length > 0 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 overflow-hidden">
                    <div className="px-3 py-2 bg-emerald-50/80 border-b border-emerald-100">
                        <div className="flex items-center gap-1.5">
                            <Plus className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                Override thêm mới ({diff.overridesAdded.length})
                            </span>
                        </div>
                    </div>
                    <div className="p-2 space-y-1">
                        {diff.overridesAdded.map((o, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] text-emerald-700 px-2 py-1 rounded bg-emerald-50">
                                <span className="font-mono">{o.employeeId.slice(0, 8)}</span>
                                <span className="text-emerald-500">→</span>
                                <span className="font-medium">{o.action}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Overrides Removed */}
            {diff.overridesRemoved.length > 0 && (
                <div className="rounded-xl border border-rose-100 bg-rose-50/30 overflow-hidden">
                    <div className="px-3 py-2 bg-rose-50/80 border-b border-rose-100">
                        <div className="flex items-center gap-1.5">
                            <Minus className="w-3 h-3 text-rose-500" />
                            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                                Override đã xóa ({diff.overridesRemoved.length})
                            </span>
                        </div>
                    </div>
                    <div className="p-2 space-y-1">
                        {diff.overridesRemoved.map((o, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] text-rose-700 px-2 py-1 rounded bg-rose-50 line-through">
                                <span className="font-mono">{o.employeeId.slice(0, 8)}</span>
                                <span className="text-rose-400">→</span>
                                <span className="font-medium">{o.action}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Hidden Nodes Changes */}
            {(diff.hiddenNodesAdded.length > 0 || diff.hiddenNodesRemoved.length > 0) && (
                <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Node ẩn/hiện thay đổi
                        </span>
                    </div>
                    <div className="p-2 space-y-1">
                        {diff.hiddenNodesAdded.map((id, i) => (
                            <div key={`add-${i}`} className="flex items-center gap-1.5 text-[11px] text-amber-700 px-2 py-1 rounded bg-amber-50">
                                <Plus className="w-3 h-3" />
                                <span>Ẩn node: <span className="font-mono">{id.slice(0, 8)}</span></span>
                            </div>
                        ))}
                        {diff.hiddenNodesRemoved.map((id, i) => (
                            <div key={`rem-${i}`} className="flex items-center gap-1.5 text-[11px] text-emerald-700 px-2 py-1 rounded bg-emerald-50">
                                <Minus className="w-3 h-3" />
                                <span>Hiện node: <span className="font-mono">{id.slice(0, 8)}</span></span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

// ─────────────────────────────────────────────────────────────
// Version Selector
// ─────────────────────────────────────────────────────────────
const VersionSelector = memo(function VersionSelector({
    versions, selected, onSelect, label, color,
}: {
    versions: OrgChartVersionSummary[];
    selected: OrgChartVersionSummary | null;
    onSelect: (v: OrgChartVersionSummary) => void;
    label: string;
    color: 'sky' | 'violet';
}) {
    const [open, setOpen] = useState(false);
    const colors = color === 'sky'
        ? { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', hover: 'hover:bg-sky-100' }
        : { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', hover: 'hover:bg-violet-100' };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all',
                    colors.bg, colors.border, colors.text, colors.hover
                )}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</span>
                    <span className="text-[11px] font-semibold truncate">
                        {selected
                            ? `v${selected.versionNum}${selected.label ? ` · ${selected.label}` : ''}`
                            : 'Chọn phiên bản...'
                        }
                    </span>
                </div>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-20 max-h-[200px] overflow-y-auto">
                    {versions.map(v => (
                        <button
                            key={v.id}
                            onClick={() => { onSelect(v); setOpen(false); }}
                            className={cn(
                                'w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors flex items-center justify-between',
                                selected?.id === v.id && 'bg-slate-50'
                            )}
                        >
                            <span className="text-[11px] font-medium text-slate-700">
                                v{v.versionNum}{v.label ? ` · ${v.label}` : ''}
                            </span>
                            <span className="text-[10px] text-slate-400">
                                {new Date(v.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                        </button>
                    ))}
                    {versions.length === 0 && (
                        <div className="px-3 py-4 text-center text-[11px] text-slate-400">
                            Chưa có phiên bản
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

// ─────────────────────────────────────────────────────────────
// Main Compare View
// ─────────────────────────────────────────────────────────────
const CompareView = memo(function CompareView({ isOpen, onClose, chartKey }: CompareViewProps) {
    const { versions, fetchVersions, isLoading } = useOrgChartVersions(chartKey);
    const [versionA, setVersionA] = useState<OrgChartVersionSummary | null>(null);
    const [versionB, setVersionB] = useState<OrgChartVersionSummary | null>(null);
    const [snapshotA, setSnapshotA] = useState<any>(null);
    const [snapshotB, setSnapshotB] = useState<any>(null);
    const [loadingSnapshots, setLoadingSnapshots] = useState(false);

    // Load versions on open
    useEffect(() => {
        if (isOpen && chartKey) {
            fetchVersions({ isScenario: false, take: 50 });
        }
    }, [isOpen, chartKey, fetchVersions]);

    // Auto-select latest 2 versions
    useEffect(() => {
        if (versions.length >= 2 && !versionA && !versionB) {
            setVersionA(versions[1]); // older
            setVersionB(versions[0]); // newer
        }
    }, [versions, versionA, versionB]);

    // Load snapshots when selections change
    useEffect(() => {
        if (!versionA || !versionB) return;
        let cancelled = false;

        const loadSnapshots = async () => {
            setLoadingSnapshots(true);
            try {
                const [resA, resB] = await Promise.all([
                    apiClient.get(`/organization/versions/${chartKey}/${versionA.versionNum}`),
                    apiClient.get(`/organization/versions/${chartKey}/${versionB.versionNum}`),
                ]);
                if (!cancelled) {
                    setSnapshotA(resA.data.snapshot);
                    setSnapshotB(resB.data.snapshot);
                }
            } catch (err) {
                console.error('[Compare] Failed to load snapshots:', err);
            } finally {
                if (!cancelled) setLoadingSnapshots(false);
            }
        };

        loadSnapshots();
        return () => { cancelled = true; };
    }, [versionA, versionB, chartKey]);

    const diff = useMemo(() => {
        if (!snapshotA || !snapshotB) return null;
        return computeSnapshotDiff(snapshotA, snapshotB);
    }, [snapshotA, snapshotB]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white/98 backdrop-blur-xl animate-in fade-in duration-200">
            {/* Header */}
            <div className="shrink-0 h-12 px-4 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <GitCompare className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">So sánh phiên bản</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Version Selectors — Side by Side */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                                Phiên bản A (cũ)
                            </label>
                            <VersionSelector
                                versions={versions}
                                selected={versionA}
                                onSelect={setVersionA}
                                label="A"
                                color="sky"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                                Phiên bản B (mới)
                            </label>
                            <VersionSelector
                                versions={versions}
                                selected={versionB}
                                onSelect={setVersionB}
                                label="B"
                                color="violet"
                            />
                        </div>
                    </div>

                    {/* Loading */}
                    {(isLoading || loadingSnapshots) && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                            <span className="ml-2 text-[11px] text-slate-400">Đang tải...</span>
                        </div>
                    )}

                    {/* No selections */}
                    {!versionA || !versionB ? (
                        !isLoading && (
                            <div className="text-center py-12">
                                <GitCompare className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm text-slate-400">Chọn 2 phiên bản để so sánh</p>
                            </div>
                        )
                    ) : (
                        /* Diff Results */
                        diff && !loadingSnapshots && (
                            <DiffSummaryCard diff={diff} />
                        )
                    )}
                </div>
            </div>
        </div>
    );
});

export default CompareView;
