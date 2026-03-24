"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { defaultFeatureFlags, FeatureFlag, FeatureFlagKey } from "@/config/feature-flags";

interface FeatureFlagsContextType {
    flags: Record<string, FeatureFlag>;
    isEnabled: (flagKey: FeatureFlagKey, userContext?: UserContext) => boolean;
    setFlag: (flagKey: FeatureFlagKey, enabled: boolean) => void;
    getAllFlags: () => Record<string, FeatureFlag>;
}

interface UserContext {
    userId?: string;
    roles?: string[];
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

const STORAGE_KEY = "eoffice_feature_flags";

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
    const [flags, setFlags] = useState<Record<string, FeatureFlag>>(defaultFeatureFlags);

    // Load overrides from localStorage on mount
    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const overrides = JSON.parse(stored);
                setFlags((prev) => {
                    const updated = { ...prev };
                    for (const [key, value] of Object.entries(overrides)) {
                        if (updated[key]) {
                            updated[key] = { ...updated[key], enabled: value as boolean };
                        }
                    }
                    return updated;
                });
            }
        } catch {
            // Ignore parsing errors
        }
    }, []);

    // Check if a feature is enabled for the given user context
    const isEnabled = useCallback((flagKey: FeatureFlagKey, userContext?: UserContext): boolean => {
        const flag = flags[flagKey];
        if (!flag) return false;

        // If flag is globally disabled, return false
        if (!flag.enabled) {
            // Check if enabled for specific conditions
            if (flag.enabledFor) {
                // Check role-based enablement
                if (flag.enabledFor.roles && userContext?.roles) {
                    const hasRole = flag.enabledFor.roles.some((role) =>
                        userContext.roles?.includes(role)
                    );
                    if (hasRole) return true;
                }

                // Check user-specific enablement
                if (flag.enabledFor.userIds && userContext?.userId) {
                    if (flag.enabledFor.userIds.includes(userContext.userId)) {
                        return true;
                    }
                }

                // Check percentage rollout
                if (flag.enabledFor.percentage !== undefined && userContext?.userId) {
                    const hash = simpleHash(userContext.userId + flagKey);
                    if ((hash % 100) < flag.enabledFor.percentage) {
                        return true;
                    }
                }
            }
            return false;
        }

        return true;
    }, [flags]);

    // Set a flag value (for admin override)
    const setFlag = useCallback((flagKey: FeatureFlagKey, enabled: boolean) => {
        setFlags((prev) => {
            const updated = {
                ...prev,
                [flagKey]: { ...prev[flagKey], enabled },
            };

            // Save overrides to localStorage
            if (typeof window !== "undefined") {
                const overrides: Record<string, boolean> = {};
                for (const [key, value] of Object.entries(updated)) {
                    if (value.enabled !== defaultFeatureFlags[key as FeatureFlagKey]?.enabled) {
                        overrides[key] = value.enabled;
                    }
                }
                localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
            }

            return updated;
        });
    }, []);

    const getAllFlags = useCallback(() => flags, [flags]);

    return (
        <FeatureFlagsContext.Provider value={{ flags, isEnabled, setFlag, getAllFlags }}>
            {children}
        </FeatureFlagsContext.Provider>
    );
}

export function useFeatureFlags() {
    const context = useContext(FeatureFlagsContext);
    if (!context) {
        throw new Error("useFeatureFlags must be used within FeatureFlagsProvider");
    }
    return context;
}

// Hook for checking a single feature flag
export function useFeatureFlag(flagKey: FeatureFlagKey) {
    const { isEnabled, flags } = useFeatureFlags();
    const flag = flags[flagKey];

    // Get user context from localStorage (in real app, get from AuthContext)
    const getUserContext = (): UserContext => {
        if (typeof window === "undefined") return {};
        const userStr = localStorage.getItem("user");
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                return { userId: user.id, roles: user.roles };
            } catch {
                return {};
            }
        }
        return {};
    };

    return {
        isEnabled: isEnabled(flagKey, getUserContext()),
        flag,
    };
}

// Simple hash function for percentage rollout
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

// Component for conditional rendering based on feature flag
interface FeatureProps {
    flag: FeatureFlagKey;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function Feature({ flag, children, fallback = null }: FeatureProps) {
    const { isEnabled } = useFeatureFlag(flag);

    if (!isEnabled) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
