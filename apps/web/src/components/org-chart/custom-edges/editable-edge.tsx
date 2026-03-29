'use client';
import { memo, useState, useCallback, useRef } from 'react';
import {
    BaseEdge,
    getSmoothStepPath,
    type EdgeProps,
    useReactFlow,
    EdgeLabelRenderer,
} from '@xyflow/react';

/**
 * EditableEdge — An edge that can be reshaped by dragging waypoints.
 *
 * How it works:
 * - Default: renders a smoothstep path from source to target
 * - When unlocked: shows a draggable midpoint handle on hover
 * - Dragging the handle creates a waypoint that bends the edge
 * - Double-click a waypoint to remove it
 * - Waypoints stored in edge.data.waypoints as {x,y}[]
 */

interface WaypointData {
    waypoints?: { x: number; y: number }[];
}

function buildPathThroughWaypoints(
    sx: number, sy: number,
    tx: number, ty: number,
    waypoints: { x: number; y: number }[]
): string {
    if (!waypoints || waypoints.length === 0) return '';

    const allPoints = [{ x: sx, y: sy }, ...waypoints, { x: tx, y: ty }];

    // Build a smooth polyline path with rounded corners
    let path = `M ${allPoints[0].x} ${allPoints[0].y}`;

    for (let i = 1; i < allPoints.length; i++) {
        const prev = allPoints[i - 1];
        const curr = allPoints[i];
        const next = allPoints[i + 1];

        if (next) {
            // Use quadratic bezier for smooth corners
            const midX1 = (prev.x + curr.x) / 2;
            const midY1 = (prev.y + curr.y) / 2;
            path += ` L ${midX1} ${midY1}`;
            const midX2 = (curr.x + next.x) / 2;
            const midY2 = (curr.y + next.y) / 2;
            path += ` Q ${curr.x} ${curr.y} ${midX2} ${midY2}`;
        } else {
            path += ` L ${curr.x} ${curr.y}`;
        }
    }

    return path;
}

const EditableEdge = memo(function EditableEdge(props: EdgeProps) {
    const {
        id,
        sourceX, sourceY,
        targetX, targetY,
        sourcePosition, targetPosition,
        style,
        markerEnd,
        data,
        selected,
    } = props;

    const { setEdges } = useReactFlow();
    const [hovered, setHovered] = useState(false);
    const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
    const dragStartRef = useRef<{ x: number; y: number; wp: { x: number; y: number } } | null>(null);

    const waypoints: { x: number; y: number }[] = (data as WaypointData)?.waypoints || [];
    const isEditable = !!(data as any)?.editable;

    // Build the path
    let edgePath: string;
    if (waypoints.length > 0) {
        edgePath = buildPathThroughWaypoints(sourceX, sourceY, targetX, targetY, waypoints);
    } else {
        [edgePath] = getSmoothStepPath({
            sourceX, sourceY,
            targetX, targetY,
            sourcePosition, targetPosition,
            borderRadius: 40,
        });
    }

    // Calculate midpoint for "add waypoint" handle
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    const updateWaypoints = useCallback((newWaypoints: { x: number; y: number }[]) => {
        setEdges(eds =>
            eds.map(e => {
                if (e.id !== id) return e;
                return {
                    ...e,
                    data: { ...e.data, waypoints: newWaypoints },
                };
            })
        );
    }, [id, setEdges]);

    const addWaypoint = useCallback(() => {
        // Push undo before adding
        window.dispatchEvent(new CustomEvent('orgchart:before-waypoint-change'));
        const newWp = { x: midX, y: midY };
        if (waypoints.length === 0) {
            updateWaypoints([newWp]);
        } else {
            const insertIdx = Math.floor(waypoints.length / 2);
            const newWps = [...waypoints];
            newWps.splice(insertIdx, 0, newWp);
            updateWaypoints(newWps);
        }
    }, [midX, midY, waypoints, updateWaypoints]);

    const removeWaypoint = useCallback((idx: number) => {
        window.dispatchEvent(new CustomEvent('orgchart:before-waypoint-change'));
        const newWps = waypoints.filter((_, i) => i !== idx);
        updateWaypoints(newWps);
    }, [waypoints, updateWaypoints]);

    const onWaypointPointerDown = useCallback((e: React.PointerEvent, idx: number) => {
        e.stopPropagation();
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);
        setDraggingIdx(idx);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            wp: { ...waypoints[idx] },
        };
        // Notify canvas to push undo snapshot before change
        window.dispatchEvent(new CustomEvent('orgchart:before-waypoint-change'));
    }, [waypoints]);

    const onWaypointPointerMove = useCallback((e: React.PointerEvent) => {
        if (draggingIdx === null || !dragStartRef.current) return;
        e.stopPropagation();

        // Get the ReactFlow viewport transform to convert screen delta to flow delta
        const rfContainer = (e.currentTarget as HTMLElement).closest('.react-flow');
        if (!rfContainer) return;
        const viewport = rfContainer.querySelector('.react-flow__viewport');
        if (!viewport) return;
        const transform = getComputedStyle(viewport).transform;
        const matrix = new DOMMatrix(transform);
        const zoom = matrix.a; // scale factor

        const dx = (e.clientX - dragStartRef.current.x) / zoom;
        const dy = (e.clientY - dragStartRef.current.y) / zoom;

        const newWps = [...waypoints];
        newWps[draggingIdx] = {
            x: dragStartRef.current.wp.x + dx,
            y: dragStartRef.current.wp.y + dy,
        };
        updateWaypoints(newWps);
    }, [draggingIdx, waypoints, updateWaypoints]);

    const onWaypointPointerUp = useCallback((e: React.PointerEvent) => {
        if (draggingIdx !== null) {
            e.stopPropagation();
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            setDraggingIdx(null);
            dragStartRef.current = null;
        }
    }, [draggingIdx]);

    const edgeStyle = {
        ...style,
        strokeWidth: style?.strokeWidth || 2,
        stroke: style?.stroke || '#64748b',
    };

    return (
        <>
            {/* Invisible fat hitbox for easier hovering */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                onMouseEnter={() => isEditable && setHovered(true)}
                onMouseLeave={() => isEditable && setHovered(false)}
                style={{ pointerEvents: isEditable ? 'stroke' : 'none' }}
            />

            {/* Actual visible edge */}
            <BaseEdge
                path={edgePath}
                style={{
                    ...edgeStyle,
                    ...(hovered && isEditable ? { stroke: '#3b82f6', strokeWidth: 2.5 } : {}),
                }}
                markerEnd={markerEnd}
            />

            {/* Waypoint handles + Add handle — rendered via EdgeLabelRenderer */}
            {isEditable && (
                <EdgeLabelRenderer>
                    {/* Existing waypoint drag handles */}
                    {waypoints.map((wp, idx) => (
                        <div
                            key={`wp-${id}-${idx}`}
                            className="nodrag nopan"
                            style={{
                                position: 'absolute',
                                left: wp.x,
                                top: wp.y,
                                transform: 'translate(-50%, -50%)',
                                pointerEvents: 'all',
                                zIndex: 1002,
                            }}
                            onPointerDown={e => onWaypointPointerDown(e, idx)}
                            onPointerMove={onWaypointPointerMove}
                            onPointerUp={onWaypointPointerUp}
                            onDoubleClick={e => {
                                e.stopPropagation();
                                removeWaypoint(idx);
                            }}
                        >
                            <div
                                className="transition-all"
                                style={{
                                    width: draggingIdx === idx ? 14 : 10,
                                    height: draggingIdx === idx ? 14 : 10,
                                    borderRadius: '50%',
                                    background: draggingIdx === idx ? '#3b82f6' : '#fff',
                                    border: `2px solid ${draggingIdx === idx ? '#1d4ed8' : '#3b82f6'}`,
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                    cursor: 'grab',
                                }}
                                title="Kéo để thay đổi đường đi • Double-click để xóa điểm"
                            />
                        </div>
                    ))}

                    {/* Add waypoint button — shows on hover when no waypoints exist */}
                    {(hovered || selected) && waypoints.length === 0 && (
                        <div
                            className="nodrag nopan"
                            style={{
                                position: 'absolute',
                                left: midX,
                                top: midY,
                                transform: 'translate(-50%, -50%)',
                                pointerEvents: 'all',
                                zIndex: 1001,
                            }}
                            onMouseEnter={() => setHovered(true)}
                        >
                            <button
                                onClick={e => { e.stopPropagation(); addWaypoint(); }}
                                className="flex items-center justify-center transition-all hover:scale-110"
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    background: '#3b82f6',
                                    border: '2px solid #fff',
                                    boxShadow: '0 2px 6px rgba(59,130,246,0.4)',
                                    color: '#fff',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    lineHeight: 1,
                                    cursor: 'pointer',
                                }}
                                title="Thêm điểm uốn để thay đổi đường đi của edge"
                            >
                                +
                            </button>
                        </div>
                    )}

                    {/* Add more waypoints button when waypoints exist */}
                    {waypoints.length > 0 && (hovered || selected) && (
                        <div
                            className="nodrag nopan"
                            style={{
                                position: 'absolute',
                                left: midX,
                                top: midY - 20,
                                transform: 'translate(-50%, -50%)',
                                pointerEvents: 'all',
                                zIndex: 1001,
                            }}
                            onMouseEnter={() => setHovered(true)}
                        >
                            <button
                                onClick={e => { e.stopPropagation(); addWaypoint(); }}
                                className="flex items-center justify-center transition-all hover:scale-110 opacity-60 hover:opacity-100"
                                style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    background: '#10b981',
                                    border: '2px solid #fff',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                    color: '#fff',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    lineHeight: 1,
                                    cursor: 'pointer',
                                }}
                                title="Thêm điểm uốn"
                            >
                                +
                            </button>
                        </div>
                    )}
                </EdgeLabelRenderer>
            )}
        </>
    );
});

export default EditableEdge;
