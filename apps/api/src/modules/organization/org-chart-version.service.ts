import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_VERSIONS = 50;

@Injectable()
export class OrgChartVersionService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Create a new version snapshot for a chart.
     * Auto-prunes unlabeled versions when exceeding MAX_VERSIONS.
     */
    async createVersion(params: {
        chartKey: string;
        snapshot: any;
        label?: string;
        description?: string;
        isScenario?: boolean;
        createdById?: string;
    }) {
        const { chartKey, snapshot, label, description, isScenario = false, createdById } = params;

        // Get next version number
        const lastVersion = await this.prisma.orgChartVersion.findFirst({
            where: { chartKey, isScenario },
            orderBy: { versionNum: 'desc' },
            select: { versionNum: true },
        });
        const nextNum = (lastVersion?.versionNum ?? 0) + 1;

        const version = await this.prisma.orgChartVersion.create({
            data: {
                chartKey,
                versionNum: nextNum,
                label,
                description,
                isScenario,
                snapshot,
                createdById,
            },
        });

        // Auto-prune: delete oldest unlabeled versions beyond MAX_VERSIONS
        if (!isScenario) {
            await this.autoPrune(chartKey);
        }

        return version;
    }

    /**
     * List versions for a chart (paginated, newest first).
     */
    async listVersions(chartKey: string, opts?: { isScenario?: boolean; take?: number; skip?: number }) {
        const { isScenario, take = 20, skip = 0 } = opts || {};

        const where: any = { chartKey };
        if (isScenario !== undefined) where.isScenario = isScenario;

        const [items, total] = await Promise.all([
            this.prisma.orgChartVersion.findMany({
                where,
                orderBy: { versionNum: 'desc' },
                take,
                skip,
                select: {
                    id: true,
                    chartKey: true,
                    versionNum: true,
                    label: true,
                    description: true,
                    isScenario: true,
                    createdAt: true,
                    createdBy: { select: { id: true, username: true } },
                },
            }),
            this.prisma.orgChartVersion.count({ where }),
        ]);

        return { items, total, take, skip };
    }

    /**
     * Get a single version with full snapshot data.
     */
    async getVersion(chartKey: string, versionNum: number) {
        const version = await this.prisma.orgChartVersion.findUnique({
            where: { chartKey_versionNum: { chartKey, versionNum } },
            include: { createdBy: { select: { id: true, username: true } } },
        });

        if (!version) throw new NotFoundException(`Version ${versionNum} not found for chart ${chartKey}`);
        return version;
    }

    /**
     * Update a version's label or description (for scenarios and labeling).
     */
    async updateVersion(id: string, data: { label?: string; description?: string; snapshot?: any }) {
        return this.prisma.orgChartVersion.update({
            where: { id },
            data,
        });
    }

    /**
     * Delete a version.
     */
    async deleteVersion(id: string) {
        return this.prisma.orgChartVersion.delete({ where: { id } });
    }

    /**
     * Restore a version snapshot — applies it as the current chart state.
     * Returns the snapshot data to be applied by the frontend.
     * Also creates a new version as a "restore point".
     */
    async restoreVersion(chartKey: string, versionNum: number, userId?: string) {
        const version = await this.getVersion(chartKey, versionNum);

        // Create a new version marking the restore
        await this.createVersion({
            chartKey,
            snapshot: version.snapshot,
            label: `Khôi phục từ v${versionNum}`,
            description: `Restored from version ${versionNum}${version.label ? ` (${version.label})` : ''}`,
            createdById: userId,
        });

        return version.snapshot;
    }

    /**
     * Apply a scenario to production — creates a new published version
     * from the scenario's snapshot, then optionally deletes the scenario.
     */
    async applyScenario(scenarioId: string, userId?: string) {
        const scenario = await this.prisma.orgChartVersion.findUnique({
            where: { id: scenarioId },
        });

        if (!scenario) throw new NotFoundException('Scenario not found');
        if (!scenario.isScenario) throw new BadRequestException('This version is not a scenario');

        // Create published version from scenario
        const published = await this.createVersion({
            chartKey: scenario.chartKey,
            snapshot: scenario.snapshot,
            label: `Áp dụng kịch bản: ${scenario.label || `#${scenario.versionNum}`}`,
            description: scenario.description ?? undefined,
            isScenario: false,
            createdById: userId,
        });

        return { published, appliedFrom: scenario };
    }

    /**
     * Auto-prune: keep only MAX_VERSIONS for a chart.
     * Labeled versions are protected from pruning.
     */
    private async autoPrune(chartKey: string) {
        const count = await this.prisma.orgChartVersion.count({
            where: { chartKey, isScenario: false },
        });

        if (count <= MAX_VERSIONS) return;

        const excess = count - MAX_VERSIONS;

        // Find oldest unlabeled versions to delete
        const toDelete = await this.prisma.orgChartVersion.findMany({
            where: { chartKey, isScenario: false, label: null },
            orderBy: { versionNum: 'asc' },
            take: excess,
            select: { id: true },
        });

        if (toDelete.length > 0) {
            await this.prisma.orgChartVersion.deleteMany({
                where: { id: { in: toDelete.map((v: { id: string }) => v.id) } },
            });
        }
    }

    /**
     * Build a snapshot from the current chart state.
     * Called by the controller when user saves layout.
     */
    async buildSnapshotFromCurrentState(chartKey: string) {
        // Gather all data that constitutes a chart version
        const [config, overrides, viewOverrides] = await Promise.all([
            this.prisma.orgChartConfig.findUnique({ where: { id: chartKey } }),
            this.prisma.orgChartOverride.findMany(),
            this.prisma.orgChartViewOverride.findFirst({ where: { chartKey } }),
        ]);

        return {
            config: config ? {
                nodesep: config.nodesep,
                ranksep: config.ranksep,
                zoom: config.zoom,
                nodeDims: config.nodeDims,
                nodeColors: config.nodeColors,
                nodeLevels: config.nodeLevels,
            } : null,
            overrides: overrides.map(o => ({
                employeeId: o.employeeId,
                action: o.action,
                targetManagerId: o.targetManagerId,
                targetHandle: o.targetHandle,
            })),
            viewOverrides: viewOverrides ? {
                hiddenNodeIds: viewOverrides.hiddenNodeIds,
                customEdges: viewOverrides.customEdges,
            } : null,
            capturedAt: new Date().toISOString(),
        };
    }
}
