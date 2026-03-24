import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRooms, getBookings, createBooking, createRoom, updateRoom, updateBooking, deleteBooking } from '../services/booking.service';

export const MOCK_ROOM_DETAILS: Record<string, any> = {
    'default': {
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=200',
        equipment: ['Wifi', 'Bảng trắng'],
        features: []
    },
    'Phòng họp Đà Nẵng': { // Map by Name if ID is unstable, or just use index logic below
        image: 'https://images.unsplash.com/photo-1577412647305-991150c7d163?auto=format&fit=crop&q=80&w=200', // Modern meeting room
        equipment: ['Màn hình LED 65"', 'Hệ thống Video Conference', 'Wifi tốc độ cao', 'Bảng kính'],
        features: ['View biển', 'Cách âm tốt']
    },
    'Phòng họp Hà Nội': {
        image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=200', // Corporate room
        equipment: ['Máy chiếu 4K', 'Hệ thống âm thanh hội thảo', 'Wifi', 'Flipchart'],
        features: ['Sức chứa lớn', 'Bàn chữ U']
    },
    'Phòng họp Nha Trang': {
        image: 'https://images.unsplash.com/photo-1517502884422-41e157d2ed22?auto=format&fit=crop&q=80&w=200', // Cozy room
        equipment: ['Tivi 55"', 'Wifi', 'Bảng trắng'],
        features: ['Không gian mở', 'Ánh sáng tự nhiên']
    },
    'Phòng họp Sài Gòn': {
        image: 'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?auto=format&fit=crop&q=80&w=200', // Executive room
        equipment: ['Màn hình ghép Videowall', 'Hệ thống Polycom', 'Ghế da cao cấp', 'Minibar'],
        features: ['Sang trọng', 'Phù hợp tiếp khách VIP']
    }
};

export const useRooms = () => {
    return useQuery({
        queryKey: ['rooms'],
        queryFn: async () => {
            const rooms = await getRooms();
            // Merge mock data
            return rooms.map(room => {
                const mock = MOCK_ROOM_DETAILS[room.name] || MOCK_ROOM_DETAILS['default'];
                return {
                    ...room,
                    image: mock.image,
                    equipment: mock.equipment,
                    features: mock.features
                };
            });
        },
    });
};

export const useBookings = (roomId?: string, from?: string, to?: string) => {
    return useQuery({
        queryKey: ['bookings', roomId, from, to],
        queryFn: () => getBookings(roomId, from, to),
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
        mutationFn: deleteBooking,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        }
    });
};
