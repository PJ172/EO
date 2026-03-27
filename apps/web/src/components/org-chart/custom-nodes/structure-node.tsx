'use client';
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Mail, Phone, X, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrgChartAvatar } from '../org-chart-avatar';

interface ManagerInfo {
    name: string;
    avatar?: string | null;
    jobTitle?: string | null;
    email?: string | null;
    phone?: string | null;
    id?: string;
    refreshKey?: number;
}

interface StructureNodeProps {
    data: {
        label: string;
        code: string;
        type: 'COMPANY' | 'FACTORY' | 'DIVISION' | 'DEPARTMENT' | 'SECTION' | 'GROUP';
        manager?: ManagerInfo | null;
        hasChildren?: boolean;
        isCollapsed?: boolean;
        onToggleCollapse?: (nodeId: string) => void;
        onClick?: () => void;
        width?: number;
        height?: number;
        refreshKey?: number;
        customBg?: string;
        customText?: string;
        customBorder?: string;
        isDesignMode?: boolean;
        isHidden?: boolean;
        onHide?: () => void;
        hideManagerEmbed?: boolean; // When true, suppress duplicate manager card inside dept node
    };
    id: string;
    targetPosition?: Position;
    sourcePosition?: Position;
}

const typeStyleMap: Record<string, { gradient: string; glow: string }> = {
    COMPANY:    { gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e293b 100%)', glow: '0 4px 20px rgba(30,58,95,0.4)' },
    FACTORY:    { gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)', glow: '0 4px 20px rgba(37,99,235,0.4)' },
    DIVISION:   { gradient: 'linear-gradient(135deg, #115e59 0%, #0d9488 50%, #14b8a6 100%)', glow: '0 4px 20px rgba(13,148,136,0.4)' },
    DEPARTMENT: { gradient: 'linear-gradient(135deg, #14532d 0%, #16a34a 50%, #22c55e 100%)', glow: '0 4px 20px rgba(22,163,74,0.35)' },
    SECTION:    { gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #0ea5e9 100%)', glow: '0 4px 20px rgba(2,132,199,0.35)' },
    GROUP:      { gradient: 'linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%)', glow: '0 4px 20px rgba(71,85,105,0.3)' },
};

export default memo(function StructureNode({
    data, id, targetPosition = Position.Top, sourcePosition = Position.Bottom,
}: StructureNodeProps) {
    const defaultStyle = typeStyleMap[data.type] || typeStyleMap.GROUP;
    const bgStyle = data.customBg || defaultStyle.gradient;
    const glowStyle = defaultStyle.glow;
    const textColor = data.customText || '#ffffff';
    const borderColor = data.customBorder || 'rgba(255,255,255,0.1)';

    const isClickable = data.type !== 'COMPANY' && data.type !== 'FACTORY';

    return (
        <div
            className={cn(
                "relative group rounded-3xl overflow-visible transition-all duration-300 shadow-xl border-2 flex flex-col",
                !data.isDesignMode && "hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02]",
                data.isDesignMode && "border-dashed border-amber-400/50 cursor-move",
                data.isHidden && "opacity-40 grayscale-[0.5]"
            )}
            style={{ 
                width: data.width || 272, 
                minHeight: data.height || 210,
                background: data.customBg || defaultStyle.gradient,
                borderColor: data.isDesignMode && data.isHidden ? '#f59e0b' : (data.customBorder || 'transparent'),
                boxShadow: data.isDesignMode ? 'none' : defaultStyle.glow,
                color: data.customText || 'white'
            }}
            onClick={data.onClick}
        >
            {/* Design Mode: Hide Button */}
            {data.isDesignMode && (
                <button
                    onClick={(e) => { e.stopPropagation(); data.onHide?.(); }}
                    className={cn(
                        "absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg z-50 transition-all",
                        data.isHidden ? "bg-slate-500 text-white" : "bg-rose-500 text-white hover:bg-rose-600 scale-110"
                    )}
                >
                    {data.isHidden ? <EyeOff className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </button>
            )}

            {/* ── Handles: invisible in lock, colored in design mode ── */}
            <Handle
                id="top" type="target" position={targetPosition}
                className={cn("!w-2.5 !h-2.5 !border-2", data.isDesignMode ? "!bg-amber-400 !border-white shadow-sm" : "!bg-transparent !border-transparent opacity-0 pointer-events-none")}
            />
            <Handle id="top-source" type="source" position={targetPosition}
                className="!w-2.5 !h-2.5 !bg-transparent !border-transparent opacity-0 pointer-events-none" />

            <Handle
                id="bottom" type="source" position={sourcePosition}
                className={cn("!w-2.5 !h-2.5 !border-2", data.isDesignMode ? "!bg-emerald-400 !border-white shadow-sm" : "!bg-transparent !border-transparent opacity-0 pointer-events-none")}
            />
            <Handle id="bottom-target" type="target" position={sourcePosition}
                className="!w-2.5 !h-2.5 !bg-transparent !border-transparent opacity-0 pointer-events-none" />

            <Handle type="target" position={Position.Left} id="left"
                className={cn("!w-2.5 !h-2.5 !border-2", data.isDesignMode ? "!bg-sky-400 !border-white shadow-sm hover:scale-125 z-50" : "!bg-transparent !border-transparent opacity-0 pointer-events-none")} />
            <Handle type="source" position={Position.Left} id="left-source"
                className="!w-2.5 !h-2.5 !bg-transparent !border-transparent opacity-0 pointer-events-none" />

            <Handle type="source" position={Position.Right} id="right"
                className={cn("!w-2.5 !h-2.5 !border-2", data.isDesignMode ? "!bg-purple-400 !border-white shadow-sm hover:scale-125 z-50" : "!bg-transparent !border-transparent opacity-0 pointer-events-none")} />
            <Handle type="target" position={Position.Right} id="right-target"
                className="!w-2.5 !h-2.5 !bg-transparent !border-transparent opacity-0 pointer-events-none" />

            <div
                className={`overflow-hidden rounded-2xl transition-all duration-300 h-full flex flex-col ${isClickable ? 'cursor-pointer' : ''}`}
                style={{
                    background: bgStyle,
                    boxShadow: glowStyle,
                    border: `1px solid ${borderColor}`,
                    minHeight: data.height || 210
                }}
                onClick={e => { 
                    e.stopPropagation(); 
                    if (isClickable) data.onClick?.(); 
                }}
            >
                {/* Header — centered, no collapse button */}
                <div className="px-4 pt-5 pb-3 text-center">
                    <h3
                        className="font-extrabold text-[14px] leading-normal line-clamp-2"
                        style={{ color: textColor }}
                        title={data.label}
                    >
                        {data.label}
                    </h3>
                </div>

                {/* Divider */}
                <div className="mx-4 border-t border-white/10" />

                {/* Manager card — hidden when employee card already shows the manager below */}
                {!data.hideManagerEmbed && (
                <div className="px-3 py-3">
                    {data.manager ? (
                        <div className="flex items-center gap-2.5">
                            <OrgChartAvatar
                                name={data.manager.name}
                                avatar={data.manager.avatar}
                                jobTitle={data.manager.jobTitle || 'Chưa cập nhật'}
                                email={data.manager.email}
                                phone={data.manager.phone}
                                refreshKey={data.refreshKey}
                            />

                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold text-white leading-normal truncate">
                                    {data.manager.name}
                                </p>
                                {data.manager.jobTitle && (
                                    <p className="text-[10px] text-white/60 leading-relaxed truncate mt-0.5">{data.manager.jobTitle}</p>
                                )}
                                <div className="mt-1 space-y-0.5">
                                    {data.manager.email && (
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="w-2.5 h-2.5 text-white/35 flex-shrink-0" />
                                            <span className="text-[9.5px] text-white/50 truncate">{data.manager.email}</span>
                                        </div>
                                    )}
                                    {data.manager.phone && (
                                        <div className="flex items-center gap-1.5">
                                            <Phone className="w-2.5 h-2.5 text-white/35 flex-shrink-0" />
                                            <span className="text-[9.5px] text-white/50 truncate">{data.manager.phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-[11px] text-white/30 italic text-center py-2">Chưa có người quản lý</p>
                    )}
                </div>
                )}
            </div>


        </div>
    );
});
