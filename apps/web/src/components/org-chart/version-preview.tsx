'use client';
import { memo, useState, useMemo, useCallback } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    BackgroundVariant,
    type Node,
    type Edge,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Eye, GitBranch, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import StructureNode from './custom-nodes/structure-node';
import EmployeeNode from './custom-nodes/employee-node';

const nodeTypes = { orgNode: StructureNode, employeeNode: EmployeeNode };

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface VersionPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    snapshot: any;
    versionNum: number;
    label?: string | null;
    mode: 'preview' | 'scenario';
    onRestore?: () => void;
}

// ─────────────────────────────────────────────────────────────
// Parse snapshot into ReactFlow nodes/edges
// ─────────────────────────────────────────────────────────────
function parseSnapshot(snapshot: any): { nodes: Node[]; edges: Edge[] } {
    if (!snapshot) return { nodes: [], edges: [] };

    // The snapshot stores config, overrides, viewOverrides
    // For preview, we show a simplified view based on the stored structure
    // In a full implementation, we'd need to re-run the layout algorithm
    // For now, we show a message about the snapshot content
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    if (snapshot.config) {
        // Create a summary node showing snapshot info
        nodes.push({
            id: 'snapshot-info',
            type: 'default',
            position: { x: 50, y: 50 },
            data: {
                label: `📸 Snapshot chứa:\n• Config (nodesep: ${snapshot.config.nodesep}, ranksep: ${snapshot.config.ranksep})\n• ${snapshot.overrides?.length || 0} overrides\n• Captured: ${snapshot.capturedAt || 'N/A'}`,
            },
            style: {
                width: 350,
                padding: 20,
                borderRadius: 16,
                border: '2px solid #e2e8f0',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                fontSize: 13,
                whiteSpace: 'pre-line' as any,
            },
        });
    }

    return { nodes, edges };
}

// ─────────────────────────────────────────────────────────────
// Preview Component (Inner)
// ─────────────────────────────────────────────────────────────
const PreviewInner = memo(function PreviewInner({
    snapshot, mode,
}: { snapshot: any; mode: 'preview' | 'scenario' }) {
    const { nodes, edges } = useMemo(() => parseSnapshot(snapshot), [snapshot]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            nodesDraggable={mode === 'scenario'}
            nodesConnectable={false}
            elementsSelectable={mode === 'scenario'}
            panOnDrag
            zoomOnScroll
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
            proOptions={{ hideAttribution: true }}
        >
            <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color={mode === 'scenario' ? '#c4b5fd' : '#e2e8f0'}
            />
        </ReactFlow>
    );
});

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
const VersionPreview = memo(function VersionPreview({
    isOpen, onClose, snapshot, versionNum, label, mode, onRestore,
}: VersionPreviewProps) {
    if (!isOpen) return null;

    const isPreview = mode === 'preview';
    const isScenario = mode === 'scenario';

    const accentColor = isPreview ? 'sky' : 'violet';

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50/95 backdrop-blur-md animate-in fade-in duration-200">
            {/* Header Bar */}
            <div className={cn(
                'shrink-0 h-12 px-4 flex items-center justify-between border-b',
                isPreview ? 'bg-sky-50/80 border-sky-100' : 'bg-violet-50/80 border-violet-100'
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center',
                        isPreview
                            ? 'bg-gradient-to-br from-sky-500 to-cyan-500'
                            : 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
                    )}>
                        {isPreview
                            ? <Eye className="w-3.5 h-3.5 text-white" />
                            : <GitBranch className="w-3.5 h-3.5 text-white" />
                        }
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className={cn(
                                'text-sm font-bold',
                                isPreview ? 'text-sky-800' : 'text-violet-800'
                            )}>
                                {isPreview ? 'Xem trước' : 'Chỉnh sửa kịch bản'}
                            </h3>
                            <span className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-full',
                                isPreview
                                    ? 'bg-sky-100 text-sky-600'
                                    : 'bg-violet-100 text-violet-600'
                            )}>
                                v{versionNum}{label ? ` · ${label}` : ''}
                            </span>
                        </div>
                        <p className={cn(
                            'text-[10px]',
                            isPreview ? 'text-sky-500' : 'text-violet-500'
                        )}>
                            {isPreview
                                ? 'Chế độ chỉ đọc — không thể chỉnh sửa'
                                : 'Chỉnh sửa thoải mái — không ảnh hưởng sơ đồ chính'
                            }
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isPreview && onRestore && (
                        <button
                            onClick={onRestore}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200/60 transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Khôi phục phiên bản này
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className={cn(
                            'p-2 rounded-lg transition-colors',
                            isPreview
                                ? 'hover:bg-sky-100 text-sky-400 hover:text-sky-600'
                                : 'hover:bg-violet-100 text-violet-400 hover:text-violet-600'
                        )}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative">
                {/* Mode badge overlay */}
                <div className="absolute top-3 left-3 z-10">
                    <div className={cn(
                        'px-3 py-1.5 rounded-full border shadow-sm flex items-center gap-1.5',
                        isPreview
                            ? 'bg-sky-50/90 border-sky-200 text-sky-700'
                            : 'bg-violet-50/90 border-violet-200 text-violet-700'
                    )}>
                        {isPreview
                            ? <Eye className="w-3 h-3" />
                            : <GitBranch className="w-3 h-3" />
                        }
                        <span className="text-[10px] font-bold tracking-wider uppercase">
                            {isPreview ? 'PREVIEW MODE' : 'SCENARIO MODE'}
                        </span>
                    </div>
                </div>

                {/* ReactFlow canvas */}
                <ReactFlowProvider>
                    <PreviewInner snapshot={snapshot} mode={mode} />
                </ReactFlowProvider>
            </div>
        </div>
    );
});

export default VersionPreview;
