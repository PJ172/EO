import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Users, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PositionNodeProps {
    data: {
        id: string;
        name: string;
        code: string;
        holderCount: number;
        holders: { id: string; fullName: string; avatar?: string; employeeCode: string }[];
    };
    id: string;
}

export default memo(function PositionNode({ data }: PositionNodeProps) {
    const hasHolders = data.holders && data.holders.length > 0;

    return (
        <div className={cn(
            "relative flex flex-col items-center rounded-2xl border-2 shadow-lg transition-all duration-200 group",
            "bg-gradient-to-b from-indigo-50/60 to-white border-indigo-200",
            "min-w-[200px] max-w-[240px]"
        )}>
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-indigo-500 to-violet-500" />

            {/* Handles */}
            <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 opacity-0 pointer-events-none" />
            <Handle type="source" position={Position.Bottom} id="bottom" className="!w-3 !h-3 opacity-0 pointer-events-none" />

            <div className="p-4 w-full">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-slate-800 leading-tight line-clamp-2">{data.name}</h3>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{data.code}</p>
                    </div>
                </div>

                {/* Holders */}
                <div className="border-t border-indigo-100 pt-2.5">
                    <div className="flex items-center gap-1 mb-2">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                            {data.holderCount} người giữ
                        </span>
                    </div>

                    {!hasHolders ? (
                        <div className="text-[11px] text-slate-400 italic text-center py-1">Chưa có ai</div>
                    ) : (
                        <div className="flex flex-wrap gap-1">
                            {data.holders.slice(0, 5).map((holder) => (
                                <div key={holder.id} className="flex items-center gap-1 bg-slate-50 rounded-full px-1.5 py-0.5 border border-slate-100">
                                    <Avatar className="w-4 h-4">
                                        <AvatarImage src={holder.avatar} />
                                        <AvatarFallback className="text-[8px] bg-indigo-100 text-indigo-600 font-bold">
                                            {holder.fullName.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-[10px] font-medium text-slate-600 max-w-[70px] truncate">
                                        {holder.fullName}
                                    </span>
                                </div>
                            ))}
                            {data.holders.length > 5 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    +{data.holders.length - 5}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
