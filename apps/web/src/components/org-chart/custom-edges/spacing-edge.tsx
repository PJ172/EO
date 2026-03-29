'use client';
import { memo } from 'react';
import {
    BaseEdge,
    getSmoothStepPath,
    type EdgeProps,
} from '@xyflow/react';

/**
 * SpacingEdge — Renders a smoothstep edge with proper styling.
 * Distance indicators are handled by NodeSpacingGuides instead
 * to avoid overlapping labels.
 */
const SpacingEdge = memo(function SpacingEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
}: EdgeProps) {
    const [edgePath] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 40,
    });

    return (
        <BaseEdge
            path={edgePath}
            style={style}
            markerEnd={markerEnd}
        />
    );
});

export default SpacingEdge;
