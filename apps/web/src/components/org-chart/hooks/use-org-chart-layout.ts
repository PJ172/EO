'use client';
import dagre from 'dagre';
import { Edge, Position } from '@xyflow/react';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
export const NODE_W = 272;
export const NODE_H = 220;
export const V_GAP  = 140;
export const H_GAP  = 50;

export interface LayoutOptions {
    nodesep: number;
    ranksep: number;
}

// ─────────────────────────────────────────────────────────────
// Dagre Graph Layout — Robust Coordinate Spacing Spawner
// ─────────────────────────────────────────────────────────────
export function treeLayout(
    rootId: string,
    allNodeIds: string[],
    edges: Edge[],
    isHorizontal: boolean,
    options: LayoutOptions,
    nodeDimsMap: Map<string, {w: number, h: number}>,
    nodeLevelsMap?: Record<string, string>
): Map<string, {x: number, y: number}> {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ 
        rankdir: isHorizontal ? 'LR' : 'TB', 
        nodesep: options.nodesep, 
        ranksep: options.ranksep 
    });

    const nonSectionNodeIds = allNodeIds.filter(id => !id.startsWith('section-'));
    const nonSectionEdges = edges.filter(e => !e.target.startsWith('section-'));

    nonSectionNodeIds.forEach(id => {
        const dims = nodeDimsMap.get(id) || { w: NODE_W, h: NODE_H };
        const w = Math.max(dims.w || NODE_W, 10);
        const h = Math.max(dims.h || NODE_H, 10);
        dagreGraph.setNode(id, { width: w, height: h });
    });
    nonSectionEdges.forEach(e => dagreGraph.setEdge(e.source, e.target));

    try {
        dagre.layout(dagreGraph);
    } catch (err) {
        console.warn('[dagre] Layout error (likely zero-dimension node):', err);
    }

    const result = new Map<string, {x: number, y: number}>();
    allNodeIds.forEach(id => {
        if (!id.startsWith('section-')) {
            const node = dagreGraph.node(id);
            const dims = nodeDimsMap.get(id) || { w: NODE_W, h: NODE_H };
            if (node) result.set(id, { x: node.x - dims.w / 2, y: node.y - dims.h / 2 });
        }
    });

    // Position Section nodes manually as a vertical stacked list inside their Department
    if (!isHorizontal) {
        allNodeIds.forEach(deptId => {
            if (deptId.startsWith('department-') && result.has(deptId)) {
                const deptPos = result.get(deptId)!;
                const deptEdges = edges.filter(e => e.source === deptId && e.target.startsWith('section-'));
                const sectionIds = deptEdges.map(e => e.target);

                if (sectionIds.length > 0) {
                    let currentY = deptPos.y + NODE_H + 40; 
                    const currentX = deptPos.x + 30;

                    sectionIds.forEach(secId => {
                        result.set(secId, { x: currentX, y: currentY });
                        currentY += NODE_H + 20;
                    });
                }
            }
        });
    } else {
         allNodeIds.forEach(deptId => {
            if (deptId.startsWith('department-') && result.has(deptId)) {
                const deptPos = result.get(deptId)!;
                const deptEdges = edges.filter(e => e.source === deptId && e.target.startsWith('section-'));
                const sectionIds = deptEdges.map(e => e.target);

                if (sectionIds.length > 0) {
                     let currentY = deptPos.y + NODE_H + 20; 
                     const currentX = deptPos.x + 0; 
                     sectionIds.forEach(secId => {
                         result.set(secId, { x: currentX, y: currentY });
                         currentY += NODE_H + 20;
                     });
                }
            }
        });
    }

    // ── Layer Alignment: Snap same-layer nodes to equal horizontal rows ──
    if (nodeLevelsMap && Object.keys(nodeLevelsMap).length > 0 && !isHorizontal) {
        const layerGroups = new Map<string, string[]>();
        allNodeIds.forEach(id => {
            const layer = nodeLevelsMap[id];
            if (layer) {
                if (!layerGroups.has(layer)) layerGroups.set(layer, []);
                layerGroups.get(layer)!.push(id);
            }
        });

        layerGroups.forEach((ids: string[]) => {
            const positions = ids.map((id: string) => result.get(id)).filter(Boolean) as {x: number, y: number}[];
            if (positions.length < 2) return;
            const targetY = Math.min(...positions.map((p: {x: number, y: number}) => p.y));
            ids.forEach((id: string) => {
                const pos = result.get(id);
                if (pos) result.set(id, { x: pos.x, y: targetY });
            });
        });

        // ── X-axis overlap resolution: evenly space nodes within each layer ──
        layerGroups.forEach((ids: string[]) => {
            if (ids.length < 2) return;
            const sorted = ids
                .map((id: string) => ({ id, pos: result.get(id)!, dims: nodeDimsMap.get(id) || { w: NODE_W, h: NODE_H } }))
                .filter((n: any) => n.pos)
                .sort((a: any, b: any) => a.pos.x - b.pos.x);

            for (let i = 1; i < sorted.length; i++) {
                const prev = sorted[i - 1];
                const curr = sorted[i];
                const minX = prev.pos.x + prev.dims.w + options.nodesep;
                if (curr.pos.x < minX) {
                    curr.pos.x = minX;
                    result.set(curr.id, { x: curr.pos.x, y: curr.pos.y });
                }
            }

            const firstX = sorted[0].pos.x;
            const lastX = sorted[sorted.length - 1].pos.x + sorted[sorted.length - 1].dims.w;
            const groupWidth = lastX - firstX;
            const origFirstX = Math.min(...ids.map((id: string) => result.get(id)?.x ?? 0));
            const origLastEntry = ids.reduce((max: number, id: string) => {
                const p = result.get(id);
                const d = nodeDimsMap.get(id) || { w: NODE_W, h: NODE_H };
                return p && (p.x + d.w) > max ? (p.x + d.w) : max;
            }, 0);
            const origCenter = (origFirstX + origLastEntry) / 2;
            const newCenter = firstX + groupWidth / 2;
            const shiftX = origCenter - newCenter;
            if (Math.abs(shiftX) > 1) {
                sorted.forEach((n: any) => {
                    result.set(n.id, { x: n.pos.x + shiftX, y: n.pos.y });
                });
            }
        });

        // Prevent vertical overlap between layers
        const layerYs = new Map<string, number>();
        layerGroups.forEach((ids: string[], layer: string) => {
            const pos = result.get(ids[0]);
            if (pos) layerYs.set(layer, pos.y);
        });
        const sortedLayers = [...layerYs.entries()].sort((a, b) => a[1] - b[1]);
        for (let i = 1; i < sortedLayers.length; i++) {
            const prevLayer = sortedLayers[i - 1][0];
            const currLayer = sortedLayers[i][0];
            const prevIds = layerGroups.get(prevLayer) || [];
            const currIds = layerGroups.get(currLayer) || [];
            let prevMaxBottom = 0;
            prevIds.forEach((id: string) => {
                const pos = result.get(id);
                const dims = nodeDimsMap.get(id) || { w: 272, h: 220 };
                if (pos) prevMaxBottom = Math.max(prevMaxBottom, pos.y + dims.h);
            });
            const currY = result.get(currIds[0])?.y ?? 0;
            const minGap = options.ranksep;
            if (currY < prevMaxBottom + minGap) {
                const shift = (prevMaxBottom + minGap) - currY;
                currIds.forEach((id: string) => {
                    const pos = result.get(id);
                    if (pos) result.set(id, { x: pos.x, y: pos.y + shift });
                });
                sortedLayers[i][1] = currY + shift;
            }
        }
    }

    // Center the whole tree
    let minX = Infinity, minY = Infinity;
    result.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); });
    result.forEach((p, id) => result.set(id, { x: p.x - minX + 60, y: p.y - minY + 60 }));

    return result;
}

// ─────────────────────────────────────────────────────────────
// Descendants helper
// ─────────────────────────────────────────────────────────────
export const getDescendantIds = (nodeId: string, edges: Edge[]): string[] => {
    const visited = new Set<string>();
    const get = (id: string): string[] => {
        if (visited.has(id)) return [];
        visited.add(id);
        const childrenIds = edges.filter(e => e.source === id).map(e => e.target);
        const descendants = [...childrenIds];
        for (const childId of childrenIds) descendants.push(...get(childId));
        return descendants;
    };
    return get(nodeId);
};

// ─────────────────────────────────────────────────────────────
// Edge style computation — level-aware coloring
// ─────────────────────────────────────────────────────────────
export function computeEmployeeLevelMap(
    nodes: any[],
    edges: any[],
): Map<string, number> {
    const empLevelMap = new Map<string, number>();
    const rootEmpIds = new Set<string>();

    const getTitleLevel = (title?: string): number | null => {
        if (!title) return null;
        const t = title.toLowerCase();
        if (t.includes('chủ tịch') || t.includes('ctyh') || t.includes('chairman')) return 0;
        if (t.includes('tổng giám đốc') || t.includes('tgđ') || t.includes('ceo')) return 1;
        if (t.includes('phó tổng') || t.includes('ptgđ') || t.includes('vice')) return 2;
        if (t.includes('giám đốc khối') || t.includes('gđk')) return 3;
        if (t.includes('trưởng phòng') || t.includes('tp') || t.includes('manager')) return 4;
        if (t.includes('phó phòng') || t.includes('pp') || t.includes('deputy')) return 5;
        return null;
    };

    nodes.forEach(n => {
        if (n.type !== 'employeeNode') return;
        const titleLevel = getTitleLevel((n.data as any)?.jobTitle);
        if (titleLevel !== null) empLevelMap.set(n.id, titleLevel);
    });

    // Find root employees (those with no incoming edge within employee nodes)
    nodes.forEach(n => {
        if (n.type !== 'employeeNode') return;
        const hasIncoming = edges.some((e: any) => e.target === n.id);
        if (!hasIncoming) rootEmpIds.add(n.id);
    });

    // BFS levels from roots
    nodes.forEach(n => {
        if (n.type !== 'employeeNode') return;
        const apiLevel = (n?.data as any)?.customLevel;
        if (apiLevel && typeof apiLevel === 'string' && apiLevel.match(/^L\d+$/)) {
            const parsed = parseInt(apiLevel.slice(1), 10);
            if (!isNaN(parsed)) empLevelMap.set(n.id, parsed);
        }
    });

    const queue = [...rootEmpIds].filter(id => !empLevelMap.has(id));
    queue.forEach(id => empLevelMap.set(id, 1));

    while (queue.length > 0) {
        const curr = queue.shift()!;
        const currLevel = empLevelMap.get(curr) || 1;
        const children = edges.filter((e: any) => e.source === curr).map((e: any) => e.target);
        for (const childId of children) {
            const childNode = nodes.find(n => n.id === childId);
            if (!childNode || childNode.type !== 'employeeNode') continue;
            if (!empLevelMap.has(childId)) {
                const nextLevel = Math.min(currLevel + 1, 10);
                empLevelMap.set(childId, nextLevel);
                queue.push(childId);
            }
        }
    }

    return empLevelMap;
}

export function getEdgeStyle(
    sourceId: string,
    targetId: string,
    edgeData: any,
    apiNodes: any[],
    empLevelMap: Map<string, number>,
): { strokeWidth: number; stroke: string } {
    if (edgeData?.data?.isMatrix) return { strokeWidth: 1.5, stroke: '#10b981' };
    if (edgeData?.data?.style) return edgeData.data.style;

    const sNode = apiNodes.find((n: any) => n.id === sourceId);
    if (!sNode) return { strokeWidth: 2, stroke: '#64748b' };

    const isStructure = sNode?.type !== 'employeeNode';
    if (isStructure) return { strokeWidth: 2.5, stroke: '#334155' };

    const level = empLevelMap.get(sourceId) || 99;
    if (level <= 1) return { strokeWidth: 3, stroke: '#1e293b' };
    if (level <= 2) return { strokeWidth: 2.5, stroke: '#334155' };
    if (level <= 3) return { strokeWidth: 2.5, stroke: '#475569' };
    if (level <= 4) return { strokeWidth: 2, stroke: '#64748b' };
    if (level <= 5) return { strokeWidth: 1.5, stroke: '#94a3b8' };
    return { strokeWidth: 1.5, stroke: '#cbd5e1' };
}

// ─────────────────────────────────────────────────────────────
// Default node colors
// ─────────────────────────────────────────────────────────────
export const defaultNodeColors: Record<string, { bg: string; text: string; border: string }> = {
    COMPANY:    { bg: 'linear-gradient(135deg, #1e293b, #334155)', text: '#f8fafc', border: '#475569' },
    FACTORY:    { bg: 'linear-gradient(135deg, #0f766e, #14b8a6)', text: '#f0fdfa', border: '#2dd4bf' },
    DIVISION:   { bg: 'linear-gradient(135deg, #1e40af, #3b82f6)', text: '#eff6ff', border: '#60a5fa' },
    DEPARTMENT: { bg: 'linear-gradient(135deg, #9333ea, #a855f7)', text: '#faf5ff', border: '#c084fc' },
    SECTION:    { bg: 'linear-gradient(135deg, #0369a1, #0ea5e9)', text: '#f0f9ff', border: '#38bdf8' },
    EMPLOYEE:   { bg: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', text: '#1e293b', border: '#cbd5e1' },
    L1:         { bg: 'linear-gradient(135deg, #1e293b, #334155)', text: '#f8fafc', border: '#475569' },
    L2:         { bg: 'linear-gradient(135deg, #312e81, #4338ca)', text: '#eef2ff', border: '#6366f1' },
    L3:         { bg: 'linear-gradient(135deg, #1e40af, #3b82f6)', text: '#eff6ff', border: '#60a5fa' },
    L4:         { bg: 'linear-gradient(135deg, #065f46, #10b981)', text: '#ecfdf5', border: '#34d399' },
    L5:         { bg: 'linear-gradient(135deg, #92400e, #f59e0b)', text: '#fffbeb', border: '#fbbf24' },
    L6:         { bg: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', text: '#1e293b', border: '#cbd5e1' },
};

export const gradientPresets = [
    { bg: 'linear-gradient(135deg, #1e293b, #334155)', text: '#f8fafc', border: '#475569' },
    { bg: 'linear-gradient(135deg, #312e81, #4338ca)', text: '#eef2ff', border: '#6366f1' },
    { bg: 'linear-gradient(135deg, #1e40af, #3b82f6)', text: '#eff6ff', border: '#60a5fa' },
    { bg: 'linear-gradient(135deg, #0f766e, #14b8a6)', text: '#f0fdfa', border: '#2dd4bf' },
    { bg: 'linear-gradient(135deg, #065f46, #10b981)', text: '#ecfdf5', border: '#34d399' },
    { bg: 'linear-gradient(135deg, #92400e, #f59e0b)', text: '#fffbeb', border: '#fbbf24' },
    { bg: 'linear-gradient(135deg, #9f1239, #e11d48)', text: '#fff1f2', border: '#fb7185' },
    { bg: 'linear-gradient(135deg, #9333ea, #a855f7)', text: '#faf5ff', border: '#c084fc' },
    { bg: 'linear-gradient(135deg, #0369a1, #0ea5e9)', text: '#f0f9ff', border: '#38bdf8' },
    { bg: 'linear-gradient(135deg, #374151, #6b7280)', text: '#f9fafb', border: '#9ca3af' },
    { bg: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', text: '#1e293b', border: '#cbd5e1' },
    { bg: 'linear-gradient(135deg, #0c4a6e, #0284c7)', text: '#e0f2fe', border: '#38bdf8' },
];
