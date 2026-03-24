import {
    ModuleDefinition,
    ModuleRegistryState,
    ModuleRegistryConfig,
    ModuleInitResult,
    ModuleEvent,
    defaultRegistryConfig,
} from "./types";

type EventListener = (event: ModuleEvent) => void;

/**
 * ModuleRegistry - Singleton class for managing application modules
 * 
 * Features:
 * - Register/unregister modules dynamically
 * - Dependency resolution
 * - Lifecycle management
 * - Event system
 */
export class ModuleRegistry {
    private static instance: ModuleRegistry;
    private state: ModuleRegistryState;
    private config: ModuleRegistryConfig;
    private eventListeners: Set<EventListener>;

    private constructor(config: Partial<ModuleRegistryConfig> = {}) {
        this.state = {
            modules: new Map(),
            activeModules: new Set(),
            loadingModules: new Set(),
        };
        this.config = { ...defaultRegistryConfig, ...config };
        this.eventListeners = new Set();
    }

    static getInstance(config?: Partial<ModuleRegistryConfig>): ModuleRegistry {
        if (!ModuleRegistry.instance) {
            ModuleRegistry.instance = new ModuleRegistry(config);
        }
        return ModuleRegistry.instance;
    }

    // Reset instance (for testing)
    static resetInstance(): void {
        ModuleRegistry.instance = undefined as unknown as ModuleRegistry;
    }

    /**
     * Register a new module
     */
    register(module: ModuleDefinition): boolean {
        if (this.state.modules.has(module.id)) {
            console.warn(`Module "${module.id}" is already registered`);
            return false;
        }

        // Validate dependencies
        if (this.config.strictDependencies && module.dependencies) {
            for (const depId of module.dependencies) {
                if (!this.state.modules.has(depId)) {
                    console.error(
                        `Module "${module.id}" requires "${depId}" which is not registered`
                    );
                    return false;
                }
            }
        }

        this.state.modules.set(module.id, module);
        this.emit({ type: "registered", moduleId: module.id, timestamp: new Date() });

        // Auto-activate if enabled
        if (this.config.autoLoadEnabled && module.status === "active") {
            this.activate(module.id);
        }

        return true;
    }

    /**
     * Unregister a module
     */
    unregister(moduleId: string): boolean {
        const module = this.state.modules.get(moduleId);
        if (!module) {
            console.warn(`Module "${moduleId}" is not registered`);
            return false;
        }

        // Check if other modules depend on this
        for (const [id, mod] of this.state.modules) {
            if (mod.dependencies?.includes(moduleId)) {
                console.error(`Cannot unregister "${moduleId}": "${id}" depends on it`);
                return false;
            }
        }

        // Deactivate first if active
        if (this.state.activeModules.has(moduleId)) {
            this.deactivate(moduleId);
        }

        this.state.modules.delete(moduleId);
        this.emit({ type: "unregistered", moduleId, timestamp: new Date() });

        return true;
    }

    /**
     * Activate a module
     */
    async activate(moduleId: string): Promise<ModuleInitResult> {
        const module = this.state.modules.get(moduleId);
        if (!module) {
            return { success: false, moduleId, error: "Module not registered" };
        }

        if (this.state.activeModules.has(moduleId)) {
            return { success: true, moduleId };
        }

        // Activate dependencies first
        if (module.dependencies) {
            for (const depId of module.dependencies) {
                if (!this.state.activeModules.has(depId)) {
                    const result = await this.activate(depId);
                    if (!result.success) {
                        return {
                            success: false,
                            moduleId,
                            error: `Failed to activate dependency: ${depId}`,
                        };
                    }
                }
            }
        }

        this.state.loadingModules.add(moduleId);

        try {
            // Run initialization hook
            if (module.onInit) {
                await module.onInit();
            }

            this.state.activeModules.add(moduleId);
            this.state.loadingModules.delete(moduleId);
            this.emit({ type: "activated", moduleId, timestamp: new Date() });

            return { success: true, moduleId };
        } catch (error) {
            this.state.loadingModules.delete(moduleId);
            return {
                success: false,
                moduleId,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    /**
     * Deactivate a module
     */
    deactivate(moduleId: string): boolean {
        const module = this.state.modules.get(moduleId);
        if (!module || !this.state.activeModules.has(moduleId)) {
            return false;
        }

        // Check if other active modules depend on this
        for (const [id, mod] of this.state.modules) {
            if (
                this.state.activeModules.has(id) &&
                mod.dependencies?.includes(moduleId)
            ) {
                console.warn(`Cannot deactivate "${moduleId}": "${id}" depends on it`);
                return false;
            }
        }

        // Run destroy hook
        if (module.onDestroy) {
            module.onDestroy();
        }

        this.state.activeModules.delete(moduleId);
        this.emit({ type: "deactivated", moduleId, timestamp: new Date() });

        return true;
    }

    /**
     * Get a module by ID
     */
    getModule(moduleId: string): ModuleDefinition | undefined {
        return this.state.modules.get(moduleId);
    }

    /**
     * Get all registered modules
     */
    getAllModules(): ModuleDefinition[] {
        return Array.from(this.state.modules.values());
    }

    /**
     * Get all active modules
     */
    getActiveModules(): ModuleDefinition[] {
        return Array.from(this.state.activeModules)
            .map((id) => this.state.modules.get(id))
            .filter((mod): mod is ModuleDefinition => mod !== undefined);
    }

    /**
     * Check if a module is active
     */
    isActive(moduleId: string): boolean {
        return this.state.activeModules.has(moduleId);
    }

    /**
     * Check if a module is loading
     */
    isLoading(moduleId: string): boolean {
        return this.state.loadingModules.has(moduleId);
    }

    /**
     * Get menu items from all active modules
     */
    getMenuItems() {
        const items: ModuleDefinition["menuItems"] = [];
        for (const module of this.getActiveModules()) {
            items.push(...module.menuItems);
        }
        return items;
    }

    /**
     * Subscribe to module events
     */
    subscribe(listener: EventListener): () => void {
        this.eventListeners.add(listener);
        return () => this.eventListeners.delete(listener);
    }

    private emit(event: ModuleEvent): void {
        for (const listener of this.eventListeners) {
            try {
                listener(event);
            } catch (error) {
                console.error("Error in module event listener:", error);
            }
        }
    }
}

// Export singleton getter
export const getModuleRegistry = ModuleRegistry.getInstance;
