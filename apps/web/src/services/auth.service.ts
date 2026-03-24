import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiGet, setAccessToken } from "@/lib/api-client";

// Types
export interface User {
    id: string;
    username: string;
    email: string;
    status: "ACTIVE" | "INACTIVE";
    roles: string[];
    employee?: {
        id: string;
        fullName: string;
        avatar?: string;
        department?: {
            id: string;
            name: string;
        };
    };
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

// Query Keys
export const authKeys = {
    all: ["auth"] as const,
    user: () => [...authKeys.all, "user"] as const,
    permissions: () => [...authKeys.all, "permissions"] as const,
};

// API Functions
const login = async (data: LoginRequest): Promise<LoginResponse> => {
    return apiPost<LoginResponse>("/auth/login", data);
};

const logout = async (): Promise<void> => {
    const refreshToken = localStorage.getItem("refreshToken");
    return apiPost("/auth/logout", { refreshToken });
};

const refreshToken = async (token: string): Promise<{ accessToken: string }> => {
    return apiPost("/auth/refresh", { refreshToken: token });
};

const getCurrentUser = async (): Promise<User> => {
    return apiGet<User>("/auth/me");
};

const getPermissions = async (): Promise<string[]> => {
    return apiGet<string[]>("/auth/permissions");
};

// Hooks
export function useCurrentUser() {
    return useQuery({
        queryKey: authKeys.user(),
        queryFn: getCurrentUser,
        // Infinity: auth data is invalidated explicitly by mutations (login/logout/role change).
        // This prevents automatic background refetch that was causing full-page flicker.
        staleTime: Infinity,
        gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
        retry: false,
    });
}

export function usePermissions() {
    return useQuery({
        queryKey: authKeys.permissions(),
        queryFn: getPermissions,
        staleTime: Infinity,
        gcTime: 60 * 60 * 1000,
        retry: false,
    });
}

export function useLogin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: login,
        onSuccess: (data) => {
            // Store tokens
            setAccessToken(data.accessToken);
            localStorage.setItem("refreshToken", data.refreshToken);

            // Update user in cache
            queryClient.setQueryData(authKeys.user(), data.user);

            // Trigger permissions fetch immediately
            queryClient.invalidateQueries({ queryKey: authKeys.permissions() });
        },
    });
}

export function useLogout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: logout,
        onSuccess: () => {
            // Clear tokens
            setAccessToken(null);
            localStorage.removeItem("refreshToken");

            // Clear all cached data
            queryClient.clear();
        },
        onError: () => {
            // Even if server logout fails, clear local state
            setAccessToken(null);
            localStorage.removeItem("refreshToken");
            queryClient.clear();
        },
    });
}

export function useRefreshToken() {
    return useMutation({
        mutationFn: refreshToken,
        onSuccess: (data) => {
            setAccessToken(data.accessToken);
        },
    });
}

// Utility functions
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission);
}

export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some((perm) => userPermissions.includes(perm));
}

export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every((perm) => userPermissions.includes(perm));
}

export function hasRole(userRoles: string[], role: string): boolean {
    return userRoles.includes(role);
}
