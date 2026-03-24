"use client";

import { useAuth } from "@/contexts/auth-context";

interface PermissionGateProps {
    children: React.ReactNode;
    permission?: string;
    permissions?: string[];
    requireAll?: boolean;
    role?: string;
    roles?: string[];
    fallback?: React.ReactNode;
}

/**
 * PermissionGate - Conditionally renders children based on user permissions/roles
 * 
 * @example
 * // Single permission
 * <PermissionGate permission="EMPLOYEE_CREATE">
 *   <Button>Add Employee</Button>
 * </PermissionGate>
 * 
 * @example
 * // Multiple permissions (any)
 * <PermissionGate permissions={["LEAVE_APPROVE_STEP1", "LEAVE_APPROVE_STEP2"]}>
 *   <Button>Approve</Button>
 * </PermissionGate>
 * 
 * @example
 * // Multiple permissions (all required)
 * <PermissionGate permissions={["EMPLOYEE_READ", "EMPLOYEE_UPDATE"]} requireAll>
 *   <Button>Edit Employee</Button>
 * </PermissionGate>
 * 
 * @example
 * // Role-based
 * <PermissionGate roles={["ADMIN", "HR"]}>
 *   <AdminPanel />
 * </PermissionGate>
 */
export function PermissionGate({
    children,
    permission,
    permissions,
    requireAll = false,
    role,
    roles,
    fallback = null,
}: PermissionGateProps) {
    const { checkPermission, checkRole, user } = useAuth();

    // Not authenticated
    if (!user) {
        return <>{fallback}</>;
    }

    // Admin bypass - admins have all permissions
    if (user.roles.includes("ADMIN")) {
        return <>{children}</>;
    }

    // Check single permission
    if (permission && !checkPermission(permission)) {
        return <>{fallback}</>;
    }

    // Check multiple permissions
    if (permissions && permissions.length > 0) {
        const hasPermissions = requireAll
            ? permissions.every((p) => checkPermission(p))
            : permissions.some((p) => checkPermission(p));

        if (!hasPermissions) {
            return <>{fallback}</>;
        }
    }

    // Check single role
    if (role && !checkRole(role)) {
        return <>{fallback}</>;
    }

    // Check multiple roles (any)
    if (roles && roles.length > 0) {
        const hasRole = roles.some((r) => checkRole(r));
        if (!hasRole) {
            return <>{fallback}</>;
        }
    }

    return <>{children}</>;
}

/**
 * Hook for checking permissions/roles in logic
 */
export function usePermissionCheck() {
    const { checkPermission, checkRole, user } = useAuth();

    const can = (permission: string): boolean => {
        if (!user) return false;
        if (user.roles.includes("ADMIN")) return true;
        return checkPermission(permission);
    };

    const canAny = (permissions: string[]): boolean => {
        if (!user) return false;
        if (user.roles.includes("ADMIN")) return true;
        return permissions.some((p) => checkPermission(p));
    };

    const canAll = (permissions: string[]): boolean => {
        if (!user) return false;
        if (user.roles.includes("ADMIN")) return true;
        return permissions.every((p) => checkPermission(p));
    };

    const hasRole = (role: string): boolean => {
        return checkRole(role);
    };

    const hasAnyRole = (roles: string[]): boolean => {
        if (!user) return false;
        return roles.some((r) => checkRole(r));
    };

    const isAdmin = user?.roles.includes("ADMIN") ?? false;
    const isHR = user?.roles.includes("HR") ?? false;
    const isManager = user?.roles.includes("MANAGER") ?? false;

    return {
        can,
        canAny,
        canAll,
        hasRole,
        hasAnyRole,
        isAdmin,
        isHR,
        isManager,
    };
}
