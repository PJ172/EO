'use client';
import { memo } from 'react';
import {
    BaseEdge,
    getSmoothStepPath,
    type EdgeProps,
    EdgeLabelRenderer,
} from '@xyflow/react';
import { buildOrthogonalPath, type ElkPoint } from '../hooks/use-elk-edge-routing';

/**
 * AutoRoutedEdge — Renders edges using ELK auto-routed bend points
 * when available, falling back to SmoothStep when not.
 * 
 * Priority system:
 * 1. Manual waypoints (user override) → highest priority
 * 2. ELK auto-routed bend points → auto collision avoidance
 * 3. SmoothStep fallback → basic straight edge
 */

interface AutoRoutedEdgeData {
    waypoints?: { x: number; y: number }[];
    elkBendPoints?: ElkPoint[];
    editable?: boolean;
    [key: string]: any;
}

function buildPathThroughWaypoints(
    sx: number, sy: number,
    tx: number, ty: number,
    waypoints: { x: number; y: number }[]
): string {
    if (!waypoints || waypoints.length === 0) return '';
    const allPoints = [{ x: sx, y: sy }, ...waypoints, { x: tx, y: ty }];
    let path = `M ${allPoints[0].x} ${allPoints[0].y}`;
    for (let i = 1; i < allPoints.length; i++) {
        const prev = allPoints[i - 1];
        const curr = allPoints[i];
        const next = allPoints[i + 1];
        if (next) {
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

const AutoRoutedEdge = memo(function AutoRoutedEdge(props: EdgeProps) {
    const {
        id,
        sourceX, sourceY,
        targetX, targetY,
        sourcePosition, targetPosition,
        style,
        markerEnd,
        data,
    } = props;

    const edgeData = data as AutoRoutedEdgeData | undefined;
    const waypoints = edgeData?.waypoints || [];
    const elkBendPoints = edgeData?.elkBendPoints || [];

    // Priority: manual waypoints > ELK auto > SmoothStep fallback
    let edgePath: string;
    let routingMethod: 'manual' | 'elk' | 'smoothstep';

    if (waypoints.length > 0) {
        // Highest priority: user's manual waypoints
        edgePath = buildPathThroughWaypoints(sourceX, sourceY, targetX, targetY, waypoints);
        routingMethod = 'manual';
    } else if (elkBendPoints.length > 0) {
        // ELK auto-routed bend points
        edgePath = buildOrthogonalPath(sourceX, sourceY, targetX, targetY, elkBendPoints, 12);
        routingMethod = 'elk';
    } else {
        // Fallback: SmoothStep
        [edgePath] = getSmoothStepPath({
            sourceX, sourceY,
            targetX, targetY,
            sourcePosition, targetPosition,
            borderRadius: 40,
        });
        routingMethod = 'smoothstep';
    }

    const edgeStyle = {
        ...style,
        strokeWidth: style?.strokeWidth || 2,
        stroke: style?.stroke || '#64748b',
    };

    return (
        <>
            {/* Invisible fat hitbox for easier selection */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                style={{ pointerEvents: 'stroke' }}
            />

            {/* Actual visible edge */}
            <BaseEdge
                path={edgePath}
                style={edgeStyle}
                markerEnd={markerEnd}
            />

            {/* Routing indicator (only in design mode for debug) */}
            {routingMethod === 'elk' && edgeData?.editable && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            left: (sourceX + targetX) / 2,
                            top: (sourceY + targetY) / 2 - 14,
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                            opacity: 0.5,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 8,
                                fontWeight: 600,
                                color: '#0ea5e9',
                                backgroundColor: '#f0f9ff',
                                padding: '1px 4px',
                                borderRadius: 3,
                                border: '1px solid #bae6fd',
                                letterSpacing: 0.5,
                            }}
                        >
                            AUTO
                        </div>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
});

export default AutoRoutedEdge;
