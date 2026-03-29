'use client';
import { useCallback, useRef, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface ElkPoint {
    x: number;
    y: number;
}

export interface ElkRoutedEdge {
    edgeId: string;
    bendPoints: ElkPoint[];
}

interface ElkNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ElkEdge {
    id: string;
    sources: string[];
    targets: string[];
}

interface ElkGraph {
    id: string;
    layoutOptions: Record<string, string>;
    children: ElkNode[];
    edges: ElkEdge[];
}

// ─────────────────────────────────────────────────────────────
// ELK Web Worker — Lazy singleton
// ─────────────────────────────────────────────────────────────
let elkWorkerInstance: any = null;
let elkInitPromise: Promise<any> | null = null;

async function getElkInstance(): Promise<any> {
    if (elkWorkerInstance) return elkWorkerInstance;
    if (elkInitPromise) return elkInitPromise;

    elkInitPromise = (async () => {
        // Use ELK's built-in Web Worker version for off-main-thread computation
        const ELK = (await import('elkjs/lib/elk.bundled')).default;
        elkWorkerInstance = new ELK();
        return elkWorkerInstance;
    })();

    return elkInitPromise;
}

// ─────────────────────────────────────────────────────────────
// Build ELK Graph from ReactFlow nodes and edges
// ─────────────────────────────────────────────────────────────
function buildElkGraph(
    nodes: Node[],
    edges: Edge[],
): ElkGraph {
    const children: ElkNode[] = nodes.map(n => ({
        id: n.id,
        x: n.position.x,
        y: n.position.y,
        width: (n.data as any)?.width || n.measured?.width || 272,
        height: (n.data as any)?.height || n.measured?.height || 220,
    }));

    const elkEdges: ElkEdge[] = edges
        .filter(e => e.source !== e.target) // no self-loops
        .map(e => ({
            id: e.id,
            sources: [e.source],
            targets: [e.target],
        }));

    return {
        id: 'root',
        layoutOptions: {
            // FIXED mode: keep node positions, only route edges
            'elk.algorithm': 'layered',
            'elk.edgeRouting': 'ORTHOGONAL',
            // Critical: use INTERACTIVE to respect fixed node positions
            'elk.layered.cycleBreaking.strategy': 'INTERACTIVE',
            'elk.layered.layering.strategy': 'INTERACTIVE',
            'elk.layered.crossingMinimization.strategy': 'INTERACTIVE',
            'elk.layered.nodePlacement.strategy': 'INTERACTIVE',
            // Spacing
            'elk.spacing.nodeNode': '30',
            'elk.spacing.edgeNode': '25',
            'elk.spacing.edgeEdge': '15',
            // Quality
            'elk.layered.mergeEdges': 'false',
            'elk.layered.mergeHierarchyEdges': 'false',
        },
        children,
        edges: elkEdges,
    };
}

// ─────────────────────────────────────────────────────────────
// Extract bend points from ELK result
// ─────────────────────────────────────────────────────────────
function extractBendPoints(elkResult: any): Map<string, ElkPoint[]> {
    const bendPointsMap = new Map<string, ElkPoint[]>();

    if (!elkResult?.edges) return bendPointsMap;

    for (const edge of elkResult.edges) {
        const points: ElkPoint[] = [];

        if (edge.sections) {
            for (const section of edge.sections) {
                if (section.bendPoints) {
                    for (const bp of section.bendPoints) {
                        points.push({ x: bp.x, y: bp.y });
                    }
                }
            }
        }

        if (points.length > 0) {
            bendPointsMap.set(edge.id, points);
        }
    }

    return bendPointsMap;
}

// ─────────────────────────────────────────────────────────────
// Build SVG path from bend points
// ─────────────────────────────────────────────────────────────
export function buildOrthogonalPath(
    sx: number, sy: number,
    tx: number, ty: number,
    bendPoints: ElkPoint[],
    borderRadius: number = 12,
): string {
    if (!bendPoints || bendPoints.length === 0) return '';

    const allPoints = [
        { x: sx, y: sy },
        ...bendPoints,
        { x: tx, y: ty },
    ];

    if (allPoints.length < 2) return '';

    let path = `M ${allPoints[0].x} ${allPoints[0].y}`;

    for (let i = 1; i < allPoints.length; i++) {
        const prev = allPoints[i - 1];
        const curr = allPoints[i];
        const next = allPoints[i + 1];

        if (next && borderRadius > 0) {
            // Calculate corner radius
            const dx1 = curr.x - prev.x;
            const dy1 = curr.y - prev.y;
            const dx2 = next.x - curr.x;
            const dy2 = next.y - curr.y;

            const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

            if (len1 === 0 || len2 === 0) {
                path += ` L ${curr.x} ${curr.y}`;
                continue;
            }

            const r = Math.min(borderRadius, len1 / 2, len2 / 2);

            // Points before and after the corner
            const beforeX = curr.x - (dx1 / len1) * r;
            const beforeY = curr.y - (dy1 / len1) * r;
            const afterX = curr.x + (dx2 / len2) * r;
            const afterY = curr.y + (dy2 / len2) * r;

            path += ` L ${beforeX} ${beforeY}`;
            path += ` Q ${curr.x} ${curr.y} ${afterX} ${afterY}`;
        } else {
            path += ` L ${curr.x} ${curr.y}`;
        }
    }

    return path;
}

// ─────────────────────────────────────────────────────────────
// Hook: useElkEdgeRouting
// ─────────────────────────────────────────────────────────────
export interface UseElkEdgeRoutingOptions {
    enabled: boolean;
    timeoutMs?: number;
}

export interface UseElkEdgeRoutingReturn {
    routeEdges: (nodes: Node[], edges: Edge[]) => Promise<Map<string, ElkPoint[]>>;
    isRouting: boolean;
    lastRoutingTimeMs: number;
}

export function useElkEdgeRouting(
    options: UseElkEdgeRoutingOptions = { enabled: true, timeoutMs: 5000 }
): UseElkEdgeRoutingReturn {
    const { enabled, timeoutMs = 5000 } = options;
    const [isRouting, setIsRouting] = useState(false);
    const [lastRoutingTimeMs, setLastRoutingTimeMs] = useState(0);
    const abortRef = useRef<boolean>(false);

    const routeEdges = useCallback(async (
        nodes: Node[],
        edges: Edge[],
    ): Promise<Map<string, ElkPoint[]>> => {
        if (!enabled || nodes.length === 0 || edges.length === 0) {
            return new Map();
        }

        setIsRouting(true);
        abortRef.current = false;
        const startTime = performance.now();

        try {
            const elk = await getElkInstance();
            const graph = buildElkGraph(nodes, edges);

            // Race between ELK layout and timeout
            const layoutPromise = elk.layout(graph);
            const timeoutPromise = new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('ELK routing timeout')), timeoutMs)
            );

            const result = await Promise.race([layoutPromise, timeoutPromise]);

            if (abortRef.current || !result) {
                return new Map();
            }

            const bendPointsMap = extractBendPoints(result);
            const elapsed = performance.now() - startTime;
            setLastRoutingTimeMs(Math.round(elapsed));

            return bendPointsMap;
        } catch (err) {
            console.warn('[ELK Edge Routing] Failed, falling back to SmoothStep:', err);
            return new Map();
        } finally {
            setIsRouting(false);
        }
    }, [enabled, timeoutMs]);

    return { routeEdges, isRouting, lastRoutingTimeMs };
}
