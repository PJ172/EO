import { getAvatarVariant } from "../../../lib/utils";
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { X, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrgChartAvatar } from '../org-chart-avatar';

const SERVER_BASE = process.env.NEXT_PUBLIC_SOCKET_URL
    || (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', ''))
    || 'http://localhost:3001';

// ─── Phân cấp màu sắc theo chức danh ────────────────────────────────
type Tier = 'director' | 'manager' | 'supervisor' | 'staff';

function getJobTier(jobTitle: string): Tier {
    const jt = (jobTitle || '').toLowerCase();
    if (
        jt.includes('giám đốc') || jt.includes('tổng giám đốc') ||
        jt.includes('chủ tịch') || jt.includes('phó giám đốc')
    ) return 'director';
    if (
        jt.includes('trưởng phòng') || jt.includes('phó phòng') ||
        jt.includes('quản lý') || jt.includes('trưởng nhóm') ||
        jt.includes('trưởng bộ phận') || jt.includes('tổ trưởng')
    ) return 'manager';
    if (
        jt.includes('giám sát') || jt.includes('chuyên viên') ||
        jt.includes('kiểm soát') || jt.includes('kiểm tra')
    ) return 'supervisor';
    return 'staff';
}

const tierStyles: Record<Tier, {
    card: string;
    avatarRing: string;
    avatarGlow: string;
    badge: string;
    dot?: string;
}> = {
    director: {
        card: 'border-amber-300 bg-gradient-to-b from-amber-50/50 to-white shadow-amber-100',
        avatarRing: 'border-amber-300',
        avatarGlow: 'bg-amber-400',
        badge: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
        dot: 'bg-amber-500',
    },
    manager: {
        card: 'border-blue-200 bg-gradient-to-b from-blue-50/40 to-white shadow-blue-100',
        avatarRing: 'border-blue-200',
        avatarGlow: 'bg-blue-500',
        badge: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white',
        dot: 'bg-blue-500',
    },
    supervisor: {
        card: 'border-emerald-200 bg-gradient-to-b from-emerald-50/40 to-white shadow-emerald-100',
        avatarRing: 'border-emerald-200',
        avatarGlow: 'bg-emerald-500',
        badge: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white',
    },
    staff: {
        card: 'border-slate-100 bg-white',
        avatarRing: 'border-slate-100',
        avatarGlow: 'bg-slate-400',
        badge: 'bg-slate-700 text-white',
    },
};

interface EmployeeNodeProps {
    data: {
        fullName: string;
        jobTitle: string;
        jobPosition?: string | null;
        avatar: string;
        employeeCode: string;
        hasChildren?: boolean;
        isCollapsed?: boolean;
        onToggleCollapse?: (nodeId: string) => void;
        refreshKey?: number;
        width?: number;
        height?: number;
        customBg?: string;
        customText?: string;
        customBorder?: string;
        customLevel?: string;
        /** DB-stored org level (L1-L7), set by admin or auto-detected */
        orgLevel?: string | null;
        level?: number;
        isDesignMode?: boolean;
        isHidden?: boolean;
        onHide?: () => void;
        email?: string;
        phone?: string;
        /** True for CTyH/TGĐ/GĐK shown as global context above dept chart */
        isGlobalContext?: boolean;
        onChangeLevel?: (nodeId: string, level: string) => void;
    };
    id: string;
    targetPosition?: Position;
    sourcePosition?: Position;
}

// Lock mode: truly invisible — 0px size, no paint
const LOCK_HANDLE = '!w-0 !h-0 !min-w-0 !min-h-0 !p-0 !border-0 !bg-transparent !shadow-none !opacity-0 pointer-events-none';
// Design mode handles with hover interaction
const DESIGN_HANDLE_T = '!w-3.5 !h-3.5 !border-2 !bg-emerald-400 !border-white shadow-md hover:!scale-125 hover:!bg-emerald-500 transition-transform z-50';
const DESIGN_HANDLE_B = '!w-3.5 !h-3.5 !border-2 !bg-amber-400 !border-white shadow-md hover:!scale-125 hover:!bg-amber-500 transition-transform z-50';
const DESIGN_HANDLE_L = '!w-3 !h-3 !border-2 !bg-sky-400 !border-white shadow-md hover:!scale-125 hover:!bg-sky-500 transition-transform z-50';
const DESIGN_HANDLE_R = '!w-3 !h-3 !border-2 !bg-rose-400 !border-white shadow-md hover:!scale-125 hover:!bg-rose-500 transition-transform z-50';

export default memo(function EmployeeNode({ data, id, targetPosition = Position.Top, sourcePosition = Position.Bottom }: EmployeeNodeProps) {
    const tier = getJobTier(data.jobTitle);
    const style = tierStyles[tier];
    const dm = data.isDesignMode;

    const nodeWidth = data.width || 254;
    const nodeHeight = data.height || 220;

    const bgStyle = data.customBg || 'white';
    const textColor = data.customText || 'inherit';
    const borderColor = data.customBorder || style.card.split(' ').find(c => c.startsWith('border-')) || 'transparent';

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-between p-3 rounded-2xl border-2 transition-all duration-300 shadow-lg group overflow-visible",
                !dm && style.card,
                dm && "hover:border-amber-400 cursor-move",
                data.isHidden && "opacity-40 grayscale-[0.5]",
                data.isGlobalContext && "opacity-70 ring-2 ring-slate-300 ring-offset-1",
            )}
            style={{
                width: nodeWidth, height: nodeHeight,
                background: bgStyle,
                borderColor: dm && data.isHidden ? '#f59e0b' : borderColor,
                color: textColor,
                borderStyle: data.isGlobalContext ? 'dashed' : 'solid',
            }}
        >
            {/* Design Mode: Hide Button */}
            {dm && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); data.onHide?.(); }}
                        className={cn(
                            "absolute -top-3 -right-3 w-7 h-7 rounded-full flex items-center justify-center shadow-md z-50 transition-all",
                            data.isHidden ? "bg-slate-500 text-white" : "bg-rose-500 text-white hover:bg-rose-600"
                        )}
                    >
                        {data.isHidden ? <EyeOff className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                    {/* Design Mode: Level Selector */}
                    <div className="absolute top-1 left-2 z-50">
                        <select
                            value={data.customLevel || `L${data.level || 1}`}
                            onChange={(e) => {
                                e.stopPropagation();
                                data.onChangeLevel?.(id, e.target.value);
                            }}
                            className="text-[9px] font-bold bg-white/90 border border-slate-300 rounded px-1 py-0.5 outline-none text-slate-700 cursor-pointer hover:border-amber-400"
                            title="Chọn Lớp (Từ L1 đến L10)"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {Array.from({ length: 10 }).map((_, i) => (
                                <option key={i} value={`L${i + 1}`}>Lớp L{i + 1}</option>
                            ))}
                        </select>
                    </div>
                </>
            )}

            {/* ── Handles ── */}
            {/* Lock mode: invisible minimal handles for edge routing only */}
            <Handle type="target" position={Position.Top} id="top"
                className={dm ? DESIGN_HANDLE_T : LOCK_HANDLE} />
            <Handle type="source" position={Position.Bottom} id="bottom"
                className={dm ? DESIGN_HANDLE_B : LOCK_HANDLE} />

            {/* Design mode only: full handle set for interactive edge wiring */}
            {dm && (
                <>
                    <Handle type="source" position={Position.Top} id="top-source" className={LOCK_HANDLE} />
                    <Handle type="target" position={Position.Bottom} id="bottom-target" className={DESIGN_HANDLE_T} />
                    <Handle type="target" position={Position.Left} id="left" className={DESIGN_HANDLE_L} />
                    <Handle type="source" position={Position.Left} id="left-source" className={DESIGN_HANDLE_L} />
                    <Handle type="source" position={Position.Right} id="right" className={DESIGN_HANDLE_R} />
                    <Handle type="target" position={Position.Right} id="right-target" className={DESIGN_HANDLE_R} />
                </>
            )}

            {/* Tier accent line — top gradient bar */}
            {!data.customBg && (tier === 'director' || tier === 'manager') && (
                <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${tier === 'director' ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`} />
            )}



            {/* Avatar */}
            <div className="relative mb-4">
                <div className={`absolute inset-0 rounded-full blur-md opacity-25 transition-opacity group-hover:opacity-50 ${style.avatarGlow}`} />
                <OrgChartAvatar
                    name={data.fullName}
                    avatar={data.avatar}
                    jobTitle={data.jobTitle}
                    email={data.email}
                    phone={data.phone}
                    refreshKey={data.refreshKey}
                    size="lg"
                    className={cn("relative z-10 transition-transform group-hover:scale-110 duration-500", style.avatarRing)}
                />

                {/* Status dot for leadership tiers */}
                {style.dot && (
                    <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-[2.5px] border-white shadow-md z-20 flex items-center justify-center ${style.dot}`}>
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                )}
            </div>

            {/* Name + Job Title */}
            <div className="flex flex-col items-center w-full gap-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    {data.employeeCode}
                </div>
                <h3
                    className="font-extrabold text-base leading-normal tracking-tight line-clamp-2 w-full text-center"
                    style={{ color: data.customText ? textColor : 'rgb(30 41 59)' }}
                >
                    {data.fullName}
                </h3>
                <div className="flex flex-col items-center w-full gap-1 mt-0.5">
                    <div className={cn("px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider leading-relaxed shadow-sm max-w-full truncate", style.badge)}>
                        {data.jobTitle || 'Nhân viên'}
                    </div>
                    {data.jobPosition && (
                        <div className="px-2 py-0.5 rounded-md text-[8.5px] font-bold uppercase tracking-wide leading-relaxed text-slate-500 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 max-w-[95%] truncate">
                            {data.jobPosition}
                        </div>
                    )}
                </div>
            </div>

            {/* Collapse toggle — positioned ON the connecting line between parent and child */}
            {data.hasChildren && (
                <button
                    className={`absolute left-1/2 -translate-x-1/2 rounded-full flex justify-center items-center shadow-lg z-50 transition-all duration-200 pointer-events-auto ${data.isCollapsed
                        ? 'bg-blue-50 border-2 border-blue-400 text-blue-600 hover:bg-blue-100 hover:border-blue-500 hover:scale-125'
                        : 'bg-white border border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600 hover:scale-110'
                    } active:scale-95`}
                    style={{ width: data.isCollapsed ? '30px' : '24px', height: data.isCollapsed ? '30px' : '24px', bottom: '-32px' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        data.onToggleCollapse?.(id);
                    }}
                >
                    {data.isCollapsed ? (
                        <span className="text-sm leading-none font-black">+</span>
                    ) : (
                        <span className="text-base leading-none font-bold" style={{marginTop: '-2px'}}>−</span>
                    )}
                </button>
            )}
        </div>
    );
});
