'use client';
import { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNodes, useReactFlow, useStore } from '@xyflow/react';

interface NeighborInfo {
    nodeId: string;
    gap: number;
    pillX: number;
    pillY: number;
    lineFrom: { x: number; y: number };
    lineTo: { x: number; y: number };
    direction: 'top' | 'bottom' | 'left' | 'right';
}

const COLORS = {
    vertical: {
        stroke: '#e11d48',
        pill: '#e11d48',
        pillBg: 'rgba(255,241,242,0.95)',
        pillBorder: '#fecdd3',
        inputBorder: '#fb7185',
    },
    horizontal: {
        stroke: '#2563eb',
        pill: '#2563eb',
        pillBg: 'rgba(239,246,255,0.95)',
        pillBorder: '#bfdbfe',
        inputBorder: '#60a5fa',
    },
};

const NODE_W = 254;
const NODE_H = 220;

function NodeSpacingGuides({ selectedNodeId }: { selectedNodeId: string | null }) {
    const nodes = useNodes();
    const { setNodes } = useReactFlow();
    const transform = useStore(s => s.transform);
    const [tx, ty, zoom] = transform;
    const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // Track the ReactFlow container's screen offset on every render
    useEffect(() => {
        const rfContainer = document.querySelector('.react-flow') as HTMLElement;
        if (rfContainer) {
            const rect = rfContainer.getBoundingClientRect();
            setContainerOffset({ x: rect.left, y: rect.top });
        }
    });

    const guides = useMemo(() => {
        if (!selectedNodeId) return [];

        const selectedNode = nodes.find(n => n.id === selectedNodeId);
        if (!selectedNode || selectedNode.hidden) return [];

        const sw = selectedNode.measured?.width || (selectedNode.data as any)?.width || NODE_W;
        const sh = selectedNode.measured?.height || (selectedNode.data as any)?.height || NODE_H;
        const sel = {
            left: selectedNode.position.x,
            top: selectedNode.position.y,
            right: selectedNode.position.x + sw,
            bottom: selectedNode.position.y + sh,
            cx: selectedNode.position.x + sw / 2,
            cy: selectedNode.position.y + sh / 2,
        };

        const neighbors: Record<string, NeighborInfo | null> = { top: null, bottom: null, left: null, right: null };

        for (const node of nodes) {
            if (node.id === selectedNodeId || node.hidden) continue;

            const nw = node.measured?.width || (node.data as any)?.width || NODE_W;
            const nh = node.measured?.height || (node.data as any)?.height || NODE_H;
            const n = {
                left: node.position.x, top: node.position.y,
                right: node.position.x + nw, bottom: node.position.y + nh,
                cx: node.position.x + nw / 2, cy: node.position.y + nh / 2,
            };

            const hOverlap = sel.right > n.left && sel.left < n.right;
            const vOverlap = sel.bottom > n.top && sel.top < n.bottom;
            const overlapMidX = hOverlap ? (Math.max(sel.left, n.left) + Math.min(sel.right, n.right)) / 2 : (sel.cx + n.cx) / 2;
            const overlapMidY = vOverlap ? (Math.max(sel.top, n.top) + Math.min(sel.bottom, n.bottom)) / 2 : (sel.cy + n.cy) / 2;

            if (n.bottom <= sel.top) {
                const gap = sel.top - n.bottom;
                if (!neighbors.top || gap < neighbors.top.gap) {
                    neighbors.top = { nodeId: node.id, gap: Math.round(gap), direction: 'top', pillX: overlapMidX, pillY: sel.top - gap / 2, lineFrom: { x: overlapMidX, y: n.bottom }, lineTo: { x: overlapMidX, y: sel.top } };
                }
            }
            if (n.top >= sel.bottom) {
                const gap = n.top - sel.bottom;
                if (!neighbors.bottom || gap < neighbors.bottom.gap) {
                    neighbors.bottom = { nodeId: node.id, gap: Math.round(gap), direction: 'bottom', pillX: overlapMidX, pillY: sel.bottom + gap / 2, lineFrom: { x: overlapMidX, y: sel.bottom }, lineTo: { x: overlapMidX, y: n.top } };
                }
            }
            if (n.right <= sel.left) {
                const gap = sel.left - n.right;
                if (!neighbors.left || gap < neighbors.left.gap) {
                    neighbors.left = { nodeId: node.id, gap: Math.round(gap), direction: 'left', pillX: sel.left - gap / 2, pillY: overlapMidY, lineFrom: { x: n.right, y: overlapMidY }, lineTo: { x: sel.left, y: overlapMidY } };
                }
            }
            if (n.left >= sel.right) {
                const gap = n.left - sel.right;
                if (!neighbors.right || gap < neighbors.right.gap) {
                    neighbors.right = { nodeId: node.id, gap: Math.round(gap), direction: 'right', pillX: sel.right + gap / 2, pillY: overlapMidY, lineFrom: { x: sel.right, y: overlapMidY }, lineTo: { x: n.left, y: overlapMidY } };
                }
            }
        }

        return Object.values(neighbors).filter(Boolean) as NeighborInfo[];
    }, [selectedNodeId, nodes]);

    const flowToScreen = useCallback((fx: number, fy: number) => ({
        x: fx * zoom + tx + containerOffset.x,
        y: fy * zoom + ty + containerOffset.y,
    }), [tx, ty, zoom, containerOffset]);

    if (!mounted || guides.length === 0 || !selectedNodeId) return null;

    // Portal to document.body — escapes ReactFlow's CSS transform context
    return createPortal(
        <>
            {/* SVG measurement lines */}
            <svg
                style={{
                    position: 'fixed',
                    top: 0, left: 0,
                    width: '100vw', height: '100vh',
                    pointerEvents: 'none',
                    zIndex: 9999,
                    overflow: 'visible',
                }}
            >
                {guides.map(g => {
                    const isVert = g.direction === 'top' || g.direction === 'bottom';
                    const from = flowToScreen(g.lineFrom.x, g.lineFrom.y);
                    const to = flowToScreen(g.lineTo.x, g.lineTo.y);
                    const color = isVert ? COLORS.vertical.stroke : COLORS.horizontal.stroke;
                    const cap = 6;
                    return (
                        <g key={g.direction}>
                            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                                stroke={color} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.75} />
                            {isVert ? (
                                <>
                                    <line x1={from.x - cap} y1={from.y} x2={from.x + cap} y2={from.y} stroke={color} strokeWidth={1.5} opacity={0.75} />
                                    <line x1={to.x - cap} y1={to.y} x2={to.x + cap} y2={to.y} stroke={color} strokeWidth={1.5} opacity={0.75} />
                                </>
                            ) : (
                                <>
                                    <line x1={from.x} y1={from.y - cap} x2={from.x} y2={from.y + cap} stroke={color} strokeWidth={1.5} opacity={0.75} />
                                    <line x1={to.x} y1={to.y - cap} x2={to.x} y2={to.y + cap} stroke={color} strokeWidth={1.5} opacity={0.75} />
                                </>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Editable distance pills */}
            {guides.map(g => {
                const isVert = g.direction === 'top' || g.direction === 'bottom';
                const pos = flowToScreen(g.pillX, g.pillY);
                return (
                    <div
                        key={g.direction}
                        style={{
                            position: 'fixed',
                            left: pos.x,
                            top: pos.y,
                            transform: 'translate(-50%, -50%)',
                            zIndex: 10000,
                            pointerEvents: 'all',
                        }}
                    >
                        <SpacingPill
                            info={g}
                            selectedNodeId={selectedNodeId}
                            setNodes={setNodes}
                            isVert={isVert}
                        />
                    </div>
                );
            })}
        </>,
        document.body
    );
}

function SpacingPill({ info, selectedNodeId, setNodes, isVert }: {
    info: NeighborInfo;
    selectedNodeId: string;
    setNodes: ReturnType<typeof useReactFlow>['setNodes'];
    isVert: boolean;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const c = isVert ? COLORS.vertical : COLORS.horizontal;
    const dirLabel = isVert ? '↕' : '↔';

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const applyNewGap = useCallback((newValue: number) => {
        if (isNaN(newValue) || newValue < 0) return;
        const delta = newValue - info.gap;
        if (delta === 0) return;
        window.dispatchEvent(new CustomEvent('orgchart:before-waypoint-change'));
        setNodes(nds =>
            nds.map(n => {
                if (n.id !== selectedNodeId) return n;
                const sign = info.direction === 'top' || info.direction === 'left' ? -1 : 1;
                return {
                    ...n,
                    position: isVert
                        ? { x: n.position.x, y: n.position.y + delta * sign }
                        : { x: n.position.x + delta * sign, y: n.position.y },
                };
            })
        );
    }, [info.gap, info.direction, isVert, selectedNodeId, setNodes]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (e.key === 'Enter') { applyNewGap(parseInt(e.currentTarget.value, 10)); setIsEditing(false); }
        if (e.key === 'Escape') setIsEditing(false);
    }, [applyNewGap]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        applyNewGap(parseInt(e.currentTarget.value, 10));
        setIsEditing(false);
    }, [applyNewGap]);

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="number"
                defaultValue={info.gap}
                min={0} max={2000}
                style={{
                    width: 60, height: 26, fontSize: 11, fontWeight: 700,
                    color: c.pill, background: '#fff',
                    border: `2px solid ${c.inputBorder}`, borderRadius: 8,
                    padding: '0 6px', textAlign: 'center', outline: 'none',
                    boxShadow: `0 2px 8px rgba(0,0,0,0.15), 0 0 0 3px ${c.pillBorder}`,
                }}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onClick={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
            />
        );
    }

    return (
        <button
            style={{
                height: 24, minWidth: 38, padding: '0 8px',
                fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                color: c.pill, background: c.pillBg,
                backdropFilter: 'blur(4px)',
                border: `1px solid ${c.pillBorder}`, borderRadius: 8,
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                cursor: 'text', display: 'flex', alignItems: 'center', gap: 3,
                transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
            onClick={e => { e.stopPropagation(); setIsEditing(true); }}
            onPointerDown={e => e.stopPropagation()}
            title={`${isVert ? 'Dọc' : 'Ngang'} ${info.direction}: ${info.gap}px — nhấn để sửa`}
        >
            <span style={{ opacity: 0.5, fontSize: 9 }}>{dirLabel}</span>
            {info.gap}
        </button>
    );
}

export default memo(NodeSpacingGuides);
