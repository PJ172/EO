/**
 * Org Chart Diff Service
 * Compares two version snapshots and produces a structured diff result
 * showing added, removed, moved nodes and changed config.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface DiffOverrideItem {
    employeeId: string;
    action: string;
    targetManagerId: string;
    targetHandle?: string | null;
}

export interface VersionSnapshot {
    config: {
        nodesep: number;
        ranksep: number;
        zoom: number;
        nodeDims?: any;
        nodeColors?: any;
        nodeLevels?: any;
    } | null;
    overrides: DiffOverrideItem[];
    viewOverrides: {
        hiddenNodeIds: any;
        customEdges: any;
    } | null;
    capturedAt: string;
}

export interface DiffResult {
    configChanges: ConfigChange[];
    overridesAdded: DiffOverrideItem[];
    overridesRemoved: DiffOverrideItem[];
    hiddenNodesAdded: string[];
    hiddenNodesRemoved: string[];
    hasDifferences: boolean;
    summary: string;
}

export interface ConfigChange {
    field: string;
    label: string;
    before: any;
    after: any;
}

// ─────────────────────────────────────────────────────────────
// Diff Computation
// ─────────────────────────────────────────────────────────────
export function computeSnapshotDiff(
    snapshotA: VersionSnapshot | null,
    snapshotB: VersionSnapshot | null,
): DiffResult {
    const result: DiffResult = {
        configChanges: [],
        overridesAdded: [],
        overridesRemoved: [],
        hiddenNodesAdded: [],
        hiddenNodesRemoved: [],
        hasDifferences: false,
        summary: '',
    };

    if (!snapshotA || !snapshotB) {
        result.summary = 'Không đủ dữ liệu để so sánh';
        return result;
    }

    // 1. Config changes
    const configA = snapshotA.config || {} as any;
    const configB = snapshotB.config || {} as any;

    const configFields: { key: string; label: string }[] = [
        { key: 'nodesep', label: 'Khoảng cách ngang' },
        { key: 'ranksep', label: 'Khoảng cách dọc' },
        { key: 'zoom', label: 'Zoom' },
    ];

    for (const { key, label } of configFields) {
        if (configA[key] !== configB[key]) {
            result.configChanges.push({
                field: key, label,
                before: configA[key],
                after: configB[key],
            });
        }
    }

    // Deep compare nodeDims, nodeColors, nodeLevels
    const deepFields = ['nodeDims', 'nodeColors', 'nodeLevels'];
    for (const key of deepFields) {
        const a = JSON.stringify(configA[key] || null);
        const b = JSON.stringify(configB[key] || null);
        if (a !== b) {
            result.configChanges.push({
                field: key,
                label: key === 'nodeDims' ? 'Kích thước node' : key === 'nodeColors' ? 'Màu node' : 'Cấp độ node',
                before: configA[key],
                after: configB[key],
            });
        }
    }

    // 2. Overrides changes
    const overridesA = snapshotA.overrides || [];
    const overridesB = snapshotB.overrides || [];

    const makeKey = (o: DiffOverrideItem) => `${o.employeeId}|${o.action}|${o.targetManagerId}`;
    const mapA = new Set(overridesA.map(makeKey));
    const mapB = new Set(overridesB.map(makeKey));

    result.overridesAdded = overridesB.filter(o => !mapA.has(makeKey(o)));
    result.overridesRemoved = overridesA.filter(o => !mapB.has(makeKey(o)));

    // 3. Hidden nodes diff
    const hiddenA: string[] = Array.isArray(snapshotA.viewOverrides?.hiddenNodeIds)
        ? snapshotA.viewOverrides!.hiddenNodeIds
        : [];
    const hiddenB: string[] = Array.isArray(snapshotB.viewOverrides?.hiddenNodeIds)
        ? snapshotB.viewOverrides!.hiddenNodeIds
        : [];

    const hiddenSetA = new Set(hiddenA);
    const hiddenSetB = new Set(hiddenB);

    result.hiddenNodesAdded = hiddenB.filter(id => !hiddenSetA.has(id));
    result.hiddenNodesRemoved = hiddenA.filter(id => !hiddenSetB.has(id));

    // Summary
    result.hasDifferences =
        result.configChanges.length > 0 ||
        result.overridesAdded.length > 0 ||
        result.overridesRemoved.length > 0 ||
        result.hiddenNodesAdded.length > 0 ||
        result.hiddenNodesRemoved.length > 0;

    const parts: string[] = [];
    if (result.configChanges.length > 0) parts.push(`${result.configChanges.length} thay đổi config`);
    if (result.overridesAdded.length > 0) parts.push(`+${result.overridesAdded.length} override`);
    if (result.overridesRemoved.length > 0) parts.push(`-${result.overridesRemoved.length} override`);
    if (result.hiddenNodesAdded.length > 0) parts.push(`+${result.hiddenNodesAdded.length} ẩn node`);
    if (result.hiddenNodesRemoved.length > 0) parts.push(`-${result.hiddenNodesRemoved.length} hiện node`);

    result.summary = parts.length > 0
        ? parts.join(', ')
        : 'Không có thay đổi';

    return result;
}
