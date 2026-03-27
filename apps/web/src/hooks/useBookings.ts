import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRooms, getBookings, createBooking, createRoom, updateRoom, updateBooking, deleteBooking } from '../services/booking.service';



export const useRooms = () => {
    return useQuery({
        queryKey: ['rooms'],
        queryFn: () => getRooms(),
        staleTime: 5 * 60 * 1000, // [M8] 5 phút — rooms hiếm thay đổi
    });
};

export const useBookings = (roomId?: string, from?: string, to?: string) => {
    return useQuery({
        queryKey: ['bookings', roomId, from, to],
        queryFn: () => getBookings(roomId, from, to),
        staleTime: 30_000, // [M8] 30 giây — tránh refetch khi focus window
    });
};

export const useCreateBooking = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createBooking,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        }
    });
};

export const useCreateRoom = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createRoom,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
        }
    });
};

export const useUpdateRoom = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateRoom(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
        }
    });
};

export const useUpdateBooking = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateBooking(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        }
    });
};

export const useDeleteBooking = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, deleteAll }: { id: string; deleteAll?: boolean }) => deleteBooking(id, deleteAll),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        }
    });
};
