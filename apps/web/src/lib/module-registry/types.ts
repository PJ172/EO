/**
 * Module Registry - Core Types and Interfaces
 * 
 * This module defines the structure for dynamically registering
 * and managing application modules.
 */

import { LucideIcon } from "lucide-react";

// Module definition interface
export interface ModuleDefinition {
    // Basic info
    id: string;
    name: string;
    description: string;
    version: string;
    icon: LucideIcon;

    // Feature flag that controls this module
    featureFlag?: string;

    // Navigation
    routes: ModuleRoute[];

    // Sidebar menu configuration
    menuItems: ModuleMenuItem[];

    // Required permissions to access this module
    requiredPermissions?: string[];
    requiredRoles?: string[];

    // Dependencies on other modules
    dependencies?: string[];

    // Module status
    status: "active" | "coming_soon" | "deprecated";

    // Lifecycle hooks
    onInit?: () => Promise<void>;
    onDestroy?: () => void;
}

export interface ModuleRoute {
    path: string;
    label: string;
    exact?: boolean;
}

export interface ModuleMenuItem {
    id: string;
    label: string;
    href: string;
    icon: LucideIcon;
    badge?: string | number;
    children?: ModuleMenuItem[];
}

// Module registry state
export interface ModuleRegistryState {
    modules: Map<string, ModuleDefinition>;
    activeModules: Set<string>;
    loadingModules: Set<string>;
}

// Module events
export type ModuleEventType = "registered" | "unregistered" | "activated" | "deactivated";

export interface ModuleEvent {
    type: ModuleEventType;
    moduleId: string;
    timestamp: Date;
}

// Module initialization result
export interface ModuleInitResult {
    success: boolean;
    moduleId: string;
    error?: string;
}

// Registry configuration
export interface ModuleRegistryConfig {
    autoLoadEnabled: boolean;
    strictDependencies: boolean;
    maxConcurrentLoads: number;
}

export const defaultRegistryConfig: ModuleRegistryConfig = {
    autoLoadEnabled: true,
    strictDependencies: true,
    maxConcurrentLoads: 3,
};
