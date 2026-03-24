"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ModuleRegistry, getModuleRegistry, ModuleDefinition } from "@/lib/module-registry";
import { allModules } from "@/config/modules";
import { useFeatureFlags } from "./feature-flags-provider";

interface ModuleRegistryContextType {
    registry: ModuleRegistry;
    activeModules: ModuleDefinition[];
    isModuleActive: (moduleId: string) => boolean;
    getMenuItems: () => ModuleDefinition["menuItems"];
    refreshModules: () => void;
}

const ModuleRegistryContext = createContext<ModuleRegistryContextType | undefined>(undefined);

export function ModuleRegistryProvider({ children }: { children: React.ReactNode }) {
    const registry = getModuleRegistry();
    const { isEnabled } = useFeatureFlags();
    const [activeModules, setActiveModules] = useState<ModuleDefinition[]>([]);
    const [initialized, setInitialized] = useState(false);

    // Initialize and register all modules
    useEffect(() => {
        if (initialized) return;

        const initModules = async () => {
            // Register all modules
            for (const module of allModules) {
                registry.register(module);
            }

            // Activate modules based on feature flags
            for (const module of allModules) {
                if (module.status !== "active") continue;

                // Check feature flag if defined
                if (module.featureFlag) {
                    const flagEnabled = isEnabled(module.featureFlag as any);
                    if (!flagEnabled) continue;
                }

                await registry.activate(module.id);
            }

            setActiveModules(registry.getActiveModules());
            setInitialized(true);
        };

        initModules();
    }, [registry, isEnabled, initialized]);

    // Subscribe to registry changes
    useEffect(() => {
        const unsubscribe = registry.subscribe(() => {
            setActiveModules(registry.getActiveModules());
        });

        return unsubscribe;
    }, [registry]);

    const isModuleActive = (moduleId: string) => registry.isActive(moduleId);

    const getMenuItems = () => {
        const items: ModuleDefinition["menuItems"] = [];
        for (const module of activeModules) {
            items.push(...module.menuItems);
        }
        return items;
    };

    const refreshModules = () => {
        setActiveModules(registry.getActiveModules());
    };

    return (
        <ModuleRegistryContext.Provider
            value={{
                registry,
                activeModules,
                isModuleActive,
                getMenuItems,
                refreshModules,
            }}
        >
            {children}
        </ModuleRegistryContext.Provider>
    );
}

export function useModuleRegistry() {
    const context = useContext(ModuleRegistryContext);
    if (!context) {
        throw new Error("useModuleRegistry must be used within ModuleRegistryProvider");
    }
    return context;
}
