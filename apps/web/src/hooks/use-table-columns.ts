import { useMemo } from "react";
import { useColumnConfig, ColumnItem } from "@/services/column-config.service";

export interface ColumnDef {
    key: string;
    label: string;
    /** Default visible state if no config exists */
    defaultVisible?: boolean;
}

/**
 * Hook that merges default column definitions with server-stored config.
 * Returns the ordered, filtered list of visible columns + all columns for the config dialog.
 */
export function useTableColumns(moduleKey: string, defaultColumns: ColumnDef[]) {
    const { data: config, isLoading } = useColumnConfig(moduleKey);

    const { visibleColumns, allColumns } = useMemo(() => {
        // If no server config, use defaults
        if (!config?.columns) {
            const all = defaultColumns.map((col, i) => ({
                key: col.key,
                label: col.label,
                visible: col.defaultVisible !== false,
                order: i,
            }));
            return {
                visibleColumns: all.filter(c => c.visible),
                allColumns: all,
            };
        }

        // Merge server config with defaults (handle new columns not in config)
        const configMap = new Map<string, ColumnItem>();
        (config.columns as ColumnItem[]).forEach(c => configMap.set(c.key, c));

        const merged: ColumnItem[] = [];
        let maxOrder = Math.max(...(config.columns as ColumnItem[]).map(c => c.order), -1);

        for (const def of defaultColumns) {
            const serverCol = configMap.get(def.key);
            if (serverCol) {
                // Always use the latest label from code definition, but keep saved order and visibility
                merged.push({ ...serverCol, label: def.label });
            } else {
                // New column not in config — append at end, visible by default
                maxOrder++;
                merged.push({
                    key: def.key,
                    label: def.label,
                    visible: def.defaultVisible !== false,
                    order: maxOrder,
                });
            }
        }

        // Sort by order
        merged.sort((a, b) => a.order - b.order);

        return {
            visibleColumns: merged.filter(c => c.visible),
            allColumns: merged,
        };
    }, [config, defaultColumns]);

    return {
        visibleColumns,
        allColumns,
        isLoading,
        hasConfig: !!config,
    };
}
