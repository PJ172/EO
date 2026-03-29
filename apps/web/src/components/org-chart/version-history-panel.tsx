'use client';
import { memo, useEffect, useState } from 'react';
import { History, Clock, RotateCcw, Tag, Trash2, X, Save, Plus, ChevronDown, ChevronUp, Loader2, GitBranch, Play, AlertTriangle, GitCompareArrows } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type OrgChartVersionSummary, useOrgChartVersions } from './hooks/use-org-chart-versions';
import { toast } from 'sonner';
import CompareView from './compare-view';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface VersionHistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    chartKey: string;
    canManage: boolean;
    onRestore?: (snapshot: any) => void;
}

// ─────────────────────────────────────────────────────────────
// Time Formatting
// ─────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// ─────────────────────────────────────────────────────────────
// Version Item
// ─────────────────────────────────────────────────────────────
const VersionItem = memo(function VersionItem({
    version, canManage, onRestore, onUpdateLabel, onDelete, isFirst,
}: {
    version: OrgChartVersionSummary;
    canManage: boolean;
    onRestore: (v: OrgChartVersionSummary) => void;
    onUpdateLabel: (id: string, label: string) => void;
    onDelete: (id: string) => void;
    isFirst: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const [editLabel, setEditLabel] = useState(false);
    const [labelValue, setLabelValue] = useState(version.label || '');

    const handleSaveLabel = () => {
        onUpdateLabel(version.id, labelValue);
        setEditLabel(false);
    };

    return (
        <div
            className={cn(
                'relative group rounded-xl border transition-all duration-200',
                isFirst
                    ? 'bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-200/60 shadow-sm'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm',
            )}
        >
            {/* Timeline dot */}
            <div className={cn(
                'absolute -left-[25px] top-4 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm',
                isFirst ? 'bg-sky-500' : version.label ? 'bg-amber-400' : 'bg-slate-300',
            )} />

            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-3 py-2.5 flex items-start gap-2 text-left"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className={cn(
                            'text-[10px] font-bold tracking-wider uppercase',
                            isFirst ? 'text-sky-600' : 'text-slate-400'
                        )}>
                            v{version.versionNum}
                        </span>
                        {version.label && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200/60">
                                <Tag className="w-2.5 h-2.5" />
                                {version.label}
                            </span>
                        )}
                        {isFirst && (
                            <span className="text-[9px] font-bold text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded-full">
                                HIỆN TẠI
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                        <Clock className="w-3 h-3 text-slate-300" />
                        <span className="text-[11px] text-slate-500" title={formatDate(version.createdAt)}>
                            {timeAgo(version.createdAt)}
                        </span>
                        {version.createdBy && (
                            <>
                                <span className="text-slate-200">·</span>
                                <span className="text-[11px] text-slate-400">
                                    {version.createdBy.username}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                {expanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-slate-300 mt-1 shrink-0" />
                    : <ChevronDown className="w-3.5 h-3.5 text-slate-300 mt-1 shrink-0" />
                }
            </button>

            {/* Expanded content */}
            {expanded && (
                <div className="px-3 pb-2.5 space-y-2 border-t border-slate-100 pt-2">
                    {version.description && (
                        <p className="text-[11px] text-slate-500 leading-relaxed">{version.description}</p>
                    )}

                    {canManage && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Label edit */}
                            {editLabel ? (
                                <div className="flex items-center gap-1 flex-1">
                                    <input
                                        type="text"
                                        value={labelValue}
                                        onChange={e => setLabelValue(e.target.value)}
                                        placeholder="Nhập nhãn..."
                                        className="flex-1 text-[11px] px-2 py-1 rounded-md border border-slate-200 focus:border-sky-300 focus:ring-1 focus:ring-sky-200 outline-none"
                                        autoFocus
                                        onKeyDown={e => e.key === 'Enter' && handleSaveLabel()}
                                    />
                                    <button onClick={handleSaveLabel} className="p-1 text-sky-600 hover:bg-sky-50 rounded">
                                        <Save className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => setEditLabel(false)} className="p-1 text-slate-400 hover:bg-slate-50 rounded">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {!isFirst && (
                                        <button
                                            onClick={() => onRestore(version)}
                                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md border border-emerald-200/60 transition-colors"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Khôi phục
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setEditLabel(true)}
                                        className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded-md border border-slate-200/60 transition-colors"
                                    >
                                        <Tag className="w-3 h-3" />
                                        Gán nhãn
                                    </button>
                                    <button
                                        onClick={() => onDelete(version.id)}
                                        className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-md border border-rose-200/60 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

// ─────────────────────────────────────────────────────────────
// Scenario Item
// ─────────────────────────────────────────────────────────────
const ScenarioItem = memo(function ScenarioItem({
    scenario, canManage, onApply, onDelete,
}: {
    scenario: OrgChartVersionSummary;
    canManage: boolean;
    onApply: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    return (
        <div className="rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/50 to-fuchsia-50/50 hover:border-violet-200 transition-all duration-200 group">
            <div className="px-3 py-2.5 flex items-start gap-2">
                <GitBranch className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-violet-700 truncate">
                        {scenario.label || `Kịch bản #${scenario.versionNum}`}
                    </div>
                    {scenario.description && (
                        <p className="text-[10px] text-violet-500/70 mt-0.5 truncate">{scenario.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                        <Clock className="w-3 h-3 text-violet-300" />
                        <span className="text-[10px] text-violet-400">{timeAgo(scenario.createdAt)}</span>
                    </div>
                </div>
            </div>

            {canManage && (
                <div className="px-3 pb-2 flex items-center gap-1.5 border-t border-violet-100 pt-1.5">
                    <button
                        onClick={() => onApply(scenario.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md border border-emerald-200/60 transition-colors"
                    >
                        <Play className="w-3 h-3" />
                        Áp dụng
                    </button>
                    <button
                        onClick={() => onDelete(scenario.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-md border border-rose-200/60 transition-colors"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
});

// ─────────────────────────────────────────────────────────────
// Main Panel
// ─────────────────────────────────────────────────────────────
const VersionHistoryPanel = memo(function VersionHistoryPanel({
    isOpen, onClose, chartKey, canManage, onRestore,
}: VersionHistoryPanelProps) {
    const {
        versions, scenarios, total, isLoading,
        fetchVersions, createVersion, restoreVersion,
        updateVersion, deleteVersion,
        createScenario, applyScenario, deleteScenario,
    } = useOrgChartVersions(chartKey);

    const [activeTab, setActiveTab] = useState<'history' | 'scenarios'>('history');
    const [confirmRestore, setConfirmRestore] = useState<OrgChartVersionSummary | null>(null);
    const [confirmApply, setConfirmApply] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [compareOpen, setCompareOpen] = useState(false);

    // Load on open
    useEffect(() => {
        if (isOpen && chartKey) {
            fetchVersions({ isScenario: false, take: 30 });
            fetchVersions({ isScenario: true, take: 20 });
        }
    }, [isOpen, chartKey, fetchVersions]);

    const handleSaveVersion = async () => {
        setIsSaving(true);
        try {
            await createVersion();
            toast.success('Đã lưu phiên bản');
        } catch {
            toast.error('Lỗi khi lưu phiên bản');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestore = async (version: OrgChartVersionSummary) => {
        try {
            const snapshot = await restoreVersion(version.versionNum);
            onRestore?.(snapshot);
            setConfirmRestore(null);
            toast.success(`Đã khôi phục v${version.versionNum}`);
        } catch {
            toast.error('Lỗi khi khôi phục');
        }
    };

    const handleUpdateLabel = async (id: string, label: string) => {
        try {
            await updateVersion(id, { label: label || undefined });
            toast.success('Đã cập nhật nhãn');
        } catch {
            toast.error('Lỗi khi cập nhật');
        }
    };

    const handleDeleteVersion = async (id: string) => {
        try {
            await deleteVersion(id);
            toast.success('Đã xóa phiên bản');
        } catch {
            toast.error('Lỗi khi xóa');
        }
    };

    const handleCreateScenario = async () => {
        try {
            await createScenario();
            toast.success('Đã tạo kịch bản mới');
        } catch {
            toast.error('Lỗi khi tạo kịch bản');
        }
    };

    const handleApplyScenario = async (id: string) => {
        try {
            const result = await applyScenario(id);
            onRestore?.(result.published?.snapshot);
            setConfirmApply(null);
            toast.success('Đã áp dụng kịch bản');
        } catch {
            toast.error('Lỗi khi áp dụng');
        }
    };

    const handleDeleteScenario = async (id: string) => {
        try {
            await deleteScenario(id);
            toast.success('Đã xóa kịch bản');
        } catch {
            toast.error('Lỗi khi xóa kịch bản');
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className={cn(
                'fixed right-0 top-0 h-full w-[340px] z-50 flex flex-col',
                'bg-white/95 backdrop-blur-xl border-l border-slate-200/60 shadow-2xl',
                'animate-in slide-in-from-right duration-300',
            )}>
                {/* Header */}
                <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center">
                            <History className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Lịch sử phiên bản</h3>
                            <p className="text-[10px] text-slate-400">{total} phiên bản · {scenarios.length} kịch bản</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Compare Button */}
                {versions.length >= 2 && (
                    <div className="shrink-0 px-4 pt-2">
                        <button
                            onClick={() => setCompareOpen(true)}
                            className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 px-3 py-1.5 rounded-lg border border-amber-200/60 transition-all"
                        >
                            <GitCompareArrows className="w-3.5 h-3.5" />
                            So sánh phiên bản
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="shrink-0 px-4 pt-3 pb-1 flex gap-1">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                            activeTab === 'history'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        )}
                    >
                        <History className="w-3 h-3" />
                        Lịch sử ({versions.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('scenarios')}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                            activeTab === 'scenarios'
                                ? 'bg-violet-50 text-violet-700 border border-violet-200/60'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        )}
                    >
                        <GitBranch className="w-3 h-3" />
                        Kịch bản ({scenarios.length})
                    </button>
                </div>

                {/* Actions */}
                {canManage && (
                    <div className="shrink-0 px-4 py-2 flex gap-1.5">
                        {activeTab === 'history' ? (
                            <button
                                onClick={handleSaveVersion}
                                disabled={isSaving}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 px-3 py-2 rounded-lg shadow-sm transition-all disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Lưu phiên bản hiện tại
                            </button>
                        ) : (
                            <button
                                onClick={handleCreateScenario}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 px-3 py-2 rounded-lg shadow-sm transition-all"
                            >
                                <Plus className="w-3 h-3" />
                                Tạo kịch bản mới
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-4 py-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        </div>
                    ) : activeTab === 'history' ? (
                        <div className="relative pl-5 space-y-2">
                            {/* Timeline line */}
                            <div className="absolute left-[7px] top-4 bottom-4 w-px bg-slate-200" />

                            {versions.length === 0 ? (
                                <div className="text-center py-8">
                                    <History className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-[11px] text-slate-400">Chưa có phiên bản nào</p>
                                    {canManage && (
                                        <p className="text-[10px] text-slate-300 mt-1">Nhấn "Lưu phiên bản" để bắt đầu</p>
                                    )}
                                </div>
                            ) : (
                                versions.map((v, i) => (
                                    <VersionItem
                                        key={v.id}
                                        version={v}
                                        canManage={canManage}
                                        isFirst={i === 0}
                                        onRestore={v2 => setConfirmRestore(v2)}
                                        onUpdateLabel={handleUpdateLabel}
                                        onDelete={handleDeleteVersion}
                                    />
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {scenarios.length === 0 ? (
                                <div className="text-center py-8">
                                    <GitBranch className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-[11px] text-slate-400">Chưa có kịch bản nào</p>
                                    {canManage && (
                                        <p className="text-[10px] text-slate-300 mt-1">Tạo kịch bản để thử nghiệm cấu trúc sơ đồ</p>
                                    )}
                                </div>
                            ) : (
                                scenarios.map(s => (
                                    <ScenarioItem
                                        key={s.id}
                                        scenario={s}
                                        canManage={canManage}
                                        onApply={id => setConfirmApply(id)}
                                        onDelete={handleDeleteScenario}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Confirm Restore Dialog */}
                {confirmRestore && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-10 flex items-center justify-center p-6">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 w-full max-w-[280px] space-y-3">
                            <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">Khôi phục phiên bản?</h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Sơ đồ sẽ được khôi phục về <strong>v{confirmRestore.versionNum}</strong>
                                        {confirmRestore.label && <> ({confirmRestore.label})</>}.
                                        Trạng thái hiện tại sẽ được tự động lưu trước khi khôi phục.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={() => setConfirmRestore(null)}
                                    className="flex-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={() => handleRestore(confirmRestore)}
                                    className="flex-1 text-[11px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-2 rounded-lg transition-colors"
                                >
                                    Khôi phục
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirm Apply Scenario Dialog */}
                {confirmApply && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-10 flex items-center justify-center p-6">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 w-full max-w-[280px] space-y-3">
                            <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                                    <Play className="w-4 h-4 text-violet-500" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">Áp dụng kịch bản?</h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Kịch bản sẽ được áp dụng làm sơ đồ chính thức. Trạng thái hiện tại sẽ được lưu lại.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={() => setConfirmApply(null)}
                                    className="flex-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={() => handleApplyScenario(confirmApply)}
                                    className="flex-1 text-[11px] font-semibold text-white bg-violet-500 hover:bg-violet-600 px-3 py-2 rounded-lg transition-colors"
                                >
                                    Áp dụng
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Compare View */}
            <CompareView
                isOpen={compareOpen}
                onClose={() => setCompareOpen(false)}
                chartKey={chartKey}
            />
        </>
    );
});

export default VersionHistoryPanel;
