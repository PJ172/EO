import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getEmployee } from '../services/employee.service';

export const useEmployees = (params?: any) => {
    return useQuery({
        queryKey: ['employees', params],
        queryFn: () => getEmployees(params),
    });
};

export const useEmployee = (id: string) => {
    return useQuery({
        queryKey: ['employee', id],
        queryFn: () => getEmployee(id),
        enabled: !!id,
    });
};

export const useCreateEmployee = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createEmployee,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};

export const useUpdateEmployee = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string;[key: string]: any }) => updateEmployee({ id, ...data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['employee'] });
        },
    });
};

export const useDeleteEmployee = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteEmployee,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
};
