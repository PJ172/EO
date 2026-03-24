import { useState, useCallback } from "react";

const LS_PREFIX = "eoffice_sort_";

interface SortState {
    key: string;
    dir: "asc" | "desc";
}

function readLS(moduleKey: string, defaultKey: string, defaultDir: "asc" | "desc"): SortState {
    if (typeof window === "undefined") return { key: defaultKey, dir: defaultDir };
    try {
        const raw = localStorage.getItem(LS_PREFIX + moduleKey);
        if (raw) {
            const parsed = JSON.parse(raw) as SortState;
            if (parsed.key && (parsed.dir === "asc" || parsed.dir === "desc")) return parsed;
        }
    } catch { /* ignore */ }
    return { key: defaultKey, dir: defaultDir };
}

function writeLS(moduleKey: string, state: SortState) {
    try {
        localStorage.setItem(LS_PREFIX + moduleKey, JSON.stringify(state));
    } catch { /* ignore */ }
}

function clearLS(moduleKey: string) {
    try {
        localStorage.removeItem(LS_PREFIX + moduleKey);
    } catch { /* ignore */ }
}

/**
 * Persistent sort state hook with localStorage support.
 * - handleSort: toggle asc/desc per column; if same col twice at desc → reset to default
 * - resetSort: reset to default key/dir and clear localStorage
 */
export function useSortState(
    moduleKey: string,
    defaultKey: string,
    defaultDir: "asc" | "desc" = "asc"
) {
    const [state, setState] = useState<SortState>(() =>
        readLS(moduleKey, defaultKey, defaultDir)
    );

    const handleSort = useCallback((key: string) => {
        setState((prev) => {
            let next: SortState;
            if (prev.key !== key) {
                next = { key, dir: "asc" };
            } else if (prev.dir === "asc") {
                next = { key, dir: "desc" };
            } else {
                // desc → reset to default
                next = { key: defaultKey, dir: defaultDir };
            }
            writeLS(moduleKey, next);
            return next;
        });
    }, [moduleKey, defaultKey, defaultDir]);

    const resetSort = useCallback(() => {
        const next: SortState = { key: defaultKey, dir: defaultDir };
        clearLS(moduleKey);
        setState(next);
    }, [moduleKey, defaultKey, defaultDir]);

    return {
        sortKey: state.key,
        sortDir: state.dir,
        handleSort,
        resetSort,
    };
}
