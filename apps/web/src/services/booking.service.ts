import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client';

export interface MeetingRoom {
    id: string;
    name: string;
    code: string;
    capacity: number;
    location?: string;
    description?: string;
    image?: string; // URL ảnh phòng
    equipment?: string[]; // Danh sách thiết bị
    features?: string[]; // Đặc điểm nổi bật
    color?: string; // Custom color
}

export interface RoomBooking {
    id: string;
    roomId: string;
    organizerEmployeeId: string;
    title: string;
    description?: string; // Nội dung
    note?: string; // Ghi chú
    isPrivate?: boolean;
    startDatetime: string;
    endDatetime: string;
    status: string;
    room?: MeetingRoom;
    organizer?: {
        firstName: string;
        lastName: string;
    };
    attendees?: {
        employeeId: string;
        employee?: {
            firstName: string;
            lastName: string;
        };
    }[];
}

export const getRooms = async (): Promise<MeetingRoom[]> => {
    return apiGet<MeetingRoom[]>('/bookings/rooms');
};

export const createRoom = async (data: any): Promise<MeetingRoom> => {
    return apiPost<MeetingRoom>('/bookings/rooms', data);
};

export const updateRoom = async (id: string, data: any): Promise<MeetingRoom> => {
    return apiPatch<MeetingRoom>(`/bookings/rooms/${id}`, data);
};

export const getBookings = async (roomId?: string, from?: string, to?: string): Promise<RoomBooking[]> => {
    return apiGet<RoomBooking[]>('/bookings', { roomId, from, to });
};

export const createBooking = async (data: any): Promise<RoomBooking> => {
    return apiPost<RoomBooking>('/bookings', data);
};

export const updateBooking = async (id: string, data: any): Promise<RoomBooking> => {
    return apiPatch<RoomBooking>(`/bookings/${id}`, data);
};

export const deleteBooking = async (id: string): Promise<void> => {
    return apiDelete(`/bookings/${id}`);
};
