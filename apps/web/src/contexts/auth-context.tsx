"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, useCurrentUser, usePermissions, useLogin, useLogout, LoginRequest } from "@/services/auth.service";
import { getAccessToken, setAccessToken } from "@/lib/api-client";

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (data: LoginRequest) => Promise<void>;
    logout: () => Promise<void>;
    checkPermission: (permission: string) => boolean;
    checkRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isInitialized, setIsInitialized] = useState(false);

    // Track token presence separately from user data.
    // This prevents isAuthenticated from flickering to false during background user refetches.
    const [hasToken, setHasToken] = useState<boolean>(() => !!getAccessToken());

    // React Query hooks — staleTime: Infinity prevents auto background refetches
    const { data: user, refetch: refetchUser } = useCurrentUser();
    const { data: permissions, refetch: refetchPerms } = usePermissions();
    const loginMutation = useLogin();
    const logoutMutation = useLogout();

    // isAuthenticated is derived from token presence (stable) + user data.
    // We use hasToken as the primary gate so that during a background user refetch
    // where user may momentarily be undefined, the app does NOT redirect to /login.
    const isAuthenticated = hasToken && (!!user || !isInitialized);

    // Guard to ensure initAuth only runs once on mount
    const hasInitialized = useRef(false);

    // Initialize auth state on mount — runs exactly once
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const initAuth = async () => {
            const token = getAccessToken();
            if (token) {
                setHasToken(true);
                try {
                    await Promise.all([refetchUser(), refetchPerms()]);
                } catch {
                    // Token invalid or expired — clear all auth state
                    setAccessToken(null);
                    setHasToken(false);
                    localStorage.removeItem("refreshToken");
                }
            } else {
                setHasToken(false);
            }
            setIsInitialized(true);
        };

        initAuth();
    }, []); // Empty deps: safe because guarded by hasInitialized ref

    // Route protection: ONLY redirect to /login if:
    // 1. Initialization is complete (not during initial load)
    // 2. There is genuinely no token (not just a background refetch race)
    // 3. We are not already on a public route
    // NOTE: The Next.js middleware handles most redirect cases server-side.
    // This effect is a client-side safety net only.
    useEffect(() => {
        if (!isInitialized) return;

        const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r));

        if (!hasToken && !isPublic) {
            // No token at all → go to login
            router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
        }
    }, [isInitialized, hasToken, pathname, router]);

    // Keep hasToken in sync when setAccessToken is called externally (token refresh)
    useEffect(() => {
        const syncToken = () => {
            setHasToken(!!getAccessToken());
        };
        // Poll minimally — only needed to catch external token clears
        // In practice, setAccessToken calls are synchronous so this just catches edge cases
        const interval = setInterval(syncToken, 5000);
        return () => clearInterval(interval);
    }, []);

    // Login function — use hard navigation to fully reset React state after login
    const login = useCallback(async (data: LoginRequest) => {
        await loginMutation.mutateAsync(data);
        setHasToken(true);
        const redirectUrl = new URLSearchParams(window.location.search).get("redirect") ||
            new URLSearchParams(window.location.search).get("callbackUrl");
        window.location.href = redirectUrl || "/dashboard";
    }, [loginMutation]);

    // Logout function
    const logout = useCallback(async () => {
        try {
            await logoutMutation.mutateAsync();
        } finally {
            setHasToken(false);
            setAccessToken(null);
            localStorage.removeItem("refreshToken");
            router.replace("/login");
        }
    }, [logoutMutation, router]);

    // Permission check
    const checkPermission = useCallback((permission: string): boolean => {
        if (!user) return false;
        // Admin has all permissions
        if (user.roles.includes("ADMIN")) return true;
        return permissions?.includes(permission) || false;
    }, [user, permissions]);

    // Role check
    const checkRole = useCallback((role: string): boolean => {
        if (!user) return false;
        return user.roles.some(r => r.toUpperCase() === role.toUpperCase());
    }, [user]);

    // isLoading is ONLY true during the very first initialization.
    // Background refetches run silently — no UI flicker.
    const isLoading = !isInitialized;

    const value: AuthContextType = {
        user: user ?? null,
        isLoading,
        isAuthenticated,
        login,
        logout,
        checkPermission,
        checkRole,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

// HOC for protected pages
export function withAuth<P extends object>(
    Component: React.ComponentType<P>,
    options?: {
        requiredRoles?: string[];
        requiredPermissions?: string[];
    }
) {
    return function ProtectedComponent(props: P) {
        const { isAuthenticated, isLoading, user, checkPermission } = useAuth();
        const router = useRouter();

        useEffect(() => {
            if (isLoading) return; // Wait for init to complete

            if (!isAuthenticated) {
                router.replace("/login");
                return;
            }

            if (isAuthenticated && user && options?.requiredRoles) {
                const hasRole = options.requiredRoles.some((role) => user.roles.includes(role));
                if (!hasRole) {
                    router.replace("/dashboard");
                }
            }

            if (isAuthenticated && options?.requiredPermissions) {
                const hasPermission = options.requiredPermissions.every((perm) => checkPermission(perm));
                if (!hasPermission) {
                    router.replace("/dashboard");
                }
            }
        }, [isLoading, isAuthenticated, user, router, checkPermission]);

        if (isLoading) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            );
        }

        if (!isAuthenticated) {
            return null;
        }

        return <Component {...props} />;
    };
}
