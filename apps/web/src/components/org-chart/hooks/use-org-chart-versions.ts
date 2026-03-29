'use client';
import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface OrgChartVersionSummary {
    id: string;
    chartKey: string;
    versionNum: number;
    label: string | null;
    description: string | null;
    isScenario: boolean;
    createdAt: string;
    createdBy: { id: string; username: string } | null;
}

export interface OrgChartVersionDetail extends OrgChartVersionSummary {
    snapshot: any;
}

export interface VersionListResponse {
    items: OrgChartVersionSummary[];
    total: number;
    take: number;
    skip: number;
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────
export function useOrgChartVersions(chartKey: string) {
    const [versions, setVersions] = useState<OrgChartVersionSummary[]>([]);
    const [scenarios, setScenarios] = useState<OrgChartVersionSummary[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const fetchVersions = useCallback(async (opts?: { isScenario?: boolean; take?: number; skip?: number }) => {
        if (!chartKey) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (opts?.isScenario !== undefined) params.set('isScenario', String(opts.isScenario));
            if (opts?.take) params.set('take', String(opts.take));
            if (opts?.skip) params.set('skip', String(opts.skip));

            const qs = params.toString();
            const res = await apiClient.get<VersionListResponse>(
                `/organization/versions/${chartKey}${qs ? `?${qs}` : ''}`
            );
            const data = res.data;

            if (opts?.isScenario === true) {
                setScenarios(data.items);
            } else if (opts?.isScenario === false) {
                setVersions(data.items);
                setTotal(data.total);
            } else {
                setVersions(data.items.filter(v => !v.isScenario));
                setScenarios(data.items.filter(v => v.isScenario));
                setTotal(data.total);
            }

            return data;
        } catch (err) {
            console.error('[Versions] Fetch failed:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [chartKey]);

    const createVersion = useCallback(async (label?: string, description?: string) => {
        const res = await apiClient.post('/organization/versions', { chartKey, label, description });
        await fetchVersions({ isScenario: false });
        return res.data;
    }, [chartKey, fetchVersions]);

    const restoreVersion = useCallback(async (versionNum: number) => {
        const res = await apiClient.post(`/organization/versions/${chartKey}/${versionNum}/restore`);
        await fetchVersions({ isScenario: false });
        return res.data;
    }, [chartKey, fetchVersions]);

    const updateVersion = useCallback(async (id: string, data: { label?: string; description?: string }) => {
        const res = await apiClient.patch(`/organization/versions/${id}`, data);
        await fetchVersions({ isScenario: false });
        return res.data;
    }, [fetchVersions]);

    const deleteVersion = useCallback(async (id: string) => {
        await apiClient.delete(`/organization/versions/${id}`);
        await fetchVersions({ isScenario: false });
    }, [fetchVersions]);

    const createScenario = useCallback(async (label?: string, description?: string, fromVersionNum?: number) => {
        const res = await apiClient.post('/organization/scenarios', {
            chartKey, label, description, fromVersionNum,
        });
        await fetchVersions({ isScenario: true });
        return res.data;
    }, [chartKey, fetchVersions]);

    const applyScenario = useCallback(async (scenarioId: string) => {
        const res = await apiClient.post(`/organization/scenarios/${scenarioId}/apply`);
        await fetchVersions({ isScenario: false });
        await fetchVersions({ isScenario: true });
        return res.data;
    }, [fetchVersions]);

    const deleteScenario = useCallback(async (id: string) => {
        await apiClient.delete(`/organization/scenarios/${id}`);
        await fetchVersions({ isScenario: true });
    }, [fetchVersions]);

    return {
        versions,
        scenarios,
        total,
        isLoading,
        fetchVersions,
        createVersion,
        restoreVersion,
        updateVersion,
        deleteVersion,
        createScenario,
        applyScenario,
        deleteScenario,
    };
}
