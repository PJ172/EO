import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete, PaginatedResponse } from "@/lib/api-client";

export interface Role {
    id: string;
    code: string;
    name: string;
    description?: string;
    createdAt: string;
}

export const getRoles = async (isDeleted = false): Promise<Role[]> => {
    return apiGet<Role[]>("/roles", { isDeleted: String(isDeleted) });
};

export const roleKeys = {
    all: ["roles"] as const,
    list: (isDeleted = false) => [...roleKeys.all, "list", { isDeleted }] as const,
};

export function useRoles(isDeleted = false) {
    return useQuery({
        queryKey: roleKeys.list(isDeleted),
        queryFn: () => getRoles(isDeleted),
    });
}
