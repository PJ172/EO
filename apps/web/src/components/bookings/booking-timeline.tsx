import { useState, useRef, useMemo } from 'react';
import { format, addMinutes, differenceInMinutes, startOfDay, setHours, setMinutes, isSameDay, isWithinInterval, getHours } from 'date-fns';
import { vi } from 'date-fns/locale';
import { RoomBooking } from '@/services/booking.service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Users, Lock, Repeat, Pencil, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface BookingTimelineProps {
    rooms: any[];
    bookings: RoomBooking[];
    date: Date;
    onSlotClick: (roomId: string, time: Date) => void;
    onBookingClick: (booking: RoomBooking) => void;
    onDeleteBooking?: (id: string, deleteAll?: boolean) => void;
    currentEmployeeId?: string;
}

const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 19;
const SLOT_DURATION = 30;
const PIXELS_PER_MINUTE = 2;
const SLOT_WIDTH = SLOT_DURATION * PIXELS_PER_MINUTE;

export function BookingTimeline({ rooms, bookings, date, onSlotClick, onBookingClick, onDeleteBooking, currentEmployeeId }: BookingTimelineProps) {
    const [deleteConfirm, setDeleteConfirm] = useState<{ booking: RoomBooking; mode: 'single' | 'ask' } | null>(null);
    // Dynamic range: expand based on actual bookings
    const { startHour, endHour } = useMemo(() => {
        let minH = DEFAULT_START_HOUR;
        let maxH = DEFAULT_END_HOUR;

        const todayBookings = bookings.filter(b => isSameDay(new Date(b.startDatetime), date));
        for (const b of todayBookings) {
            const sH = getHours(new Date(b.startDatetime));
            const eH = getHours(new Date(b.endDatetime));
            if (sH < minH) minH = sH;
            if (eH >= maxH) maxH = eH + 1;
        }

        return { startHour: Math.max(0, minH), endHour: Math.min(24, maxH) };
    }, [bookings, date]);

    // Room real-time status
    const getRoomStatus = (roomId: string) => {
        const now = new Date();
        if (!isSameDay(now, date)) return null;

        const currentBooking = bookings.find(b =>
            b.roomId === roomId &&
            isSameDay(new Date(b.startDatetime), date) &&
            isWithinInterval(now, { start: new Date(b.startDatetime), end: new Date(b.endDatetime) })
        );

        if (currentBooking) return { status: 'booked' as const, label: 'Đang họp' };
        return { status: 'available' as const, label: 'Trống' };
    };

    // Generate Time Slots
    const timeSlots = useMemo(() => {
        const slots = [];
        let currentTime = setMinutes(setHours(startOfDay(date), startHour), 0);
        const endTime = setMinutes(setHours(startOfDay(date), endHour), 0);

        while (currentTime <= endTime) {
            slots.push(currentTime);
            currentTime = addMinutes(currentTime, SLOT_DURATION);
        }
        return slots;
    }, [date, startHour, endHour]);

    // Calculate Position Style
    const getBookingStyle = (booking: RoomBooking) => {
        const start = new Date(booking.startDatetime);
        const end = new Date(booking.endDatetime);
        const baseTime = setMinutes(setHours(startOfDay(date), startHour), 0);

        const startDiff = differenceInMinutes(start, baseTime);
        const duration = differenceInMinutes(end, start);

        return {
            left: `${Math.max(0, startDiff * PIXELS_PER_MINUTE)}px`,
            width: `${duration * PIXELS_PER_MINUTE}px`,
        };
    };

    return (
        <>
        <div className="border rounded-lg bg-background overflow-hidden flex flex-col shadow-sm">
            {/* Header: Time Grid */}
            <div className="flex border-b bg-muted/40 sticky top-0 z-10">
                <div className="w-48 shrink-0 border-r-2 border-r-primary/20 p-4 font-semibold text-sm text-muted-foreground bg-background sticky left-0 z-20 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.15)] flex items-center">
                    Phòng họp
                </div>
                <div className="flex overflow-hidden">
                    {timeSlots.map((slot, i) => (
                        <div
                            key={i}
                            className="shrink-0 border-r last:border-r-0 flex items-center justify-center text-xs text-muted-foreground font-medium"
                            style={{ width: `${SLOT_WIDTH}px`, height: '48px' }}
                        >
                            {format(slot, 'HH:mm')}
                        </div>
                    ))}
                </div>
            </div>

            {/* Body: Room Rows */}
            <div className="overflow-auto max-h-[600px]">
                {rooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <Users className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">Chưa có phòng họp nào</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-sm">Hãy thêm phòng họp đầu tiên để bắt đầu sử dụng Gantt Timeline</p>
                    </div>
                ) : rooms.map(room => {
                    const roomStatus = getRoomStatus(room.id);
                    return (
                        <div key={room.id} className="flex border-b last:border-b-0 min-h-[80px] group">
                            {/* Room Info Sticky Column */}
                            <div className="w-48 shrink-0 border-r-2 border-r-primary/20 p-3 bg-background sticky left-0 z-[5] flex flex-col justify-center group-hover:bg-slate-50 transition-colors shadow-[4px_0_12px_-4px_rgba(0,0,0,0.15)]">
                                <div className="flex items-center justify-between">
                                    <div className="font-semibold text-sm text-foreground truncate">{room.name}</div>
                                    {roomStatus && (
                                        <span className={cn(
                                            "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0",
                                            roomStatus.status === 'booked'
                                                ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                                                : "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"
                                        )}>
                                            {roomStatus.label}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Users className="h-3 w-3" /> {room.capacity}
                                </div>
                            </div>

                            {/* Timeline Track */}
                            <div className="relative flex min-w-max bg-grid-slate-100">
                                {/* Background Grid */}
                                <div className="absolute inset-0 flex h-full pointer-events-none">
                                    {timeSlots.map((_, i) => (
                                        <div
                                            key={i}
                                            className="border-r h-full border-dashed border-border/50 first:border-l"
                                            style={{ width: `${SLOT_WIDTH}px` }}
                                        />
                                    ))}
                                    {/* Current Time Indicator */}
                                    {isSameDay(new Date(), date) && (() => {
                                        const now = new Date();
                                        const base = setMinutes(setHours(now, startHour), 0);
                                        const diff = differenceInMinutes(now, base);
                                        if (diff >= 0 && diff <= (endHour - startHour) * 60) {
                                            return (
                                                <div
                                                    className="absolute top-0 bottom-0 border-l-2 border-red-500 z-30 pointer-events-none"
                                                    style={{ left: `${diff * PIXELS_PER_MINUTE}px` }}
                                                >
                                                    <div className="absolute -top-1 -left-[5px] w-2.5 h-2.5 rounded-full bg-red-500" />
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>

                                {/* Clickable Slots Layer */}
                                <div className="flex h-full absolute inset-0 z-0">
                                    {timeSlots.map((slot, i) => (
                                        <div
                                            key={i}
                                            className="h-full hover:bg-blue-50/50 cursor-pointer transition-colors"
                                            style={{ width: `${SLOT_WIDTH}px` }}
                                            onClick={() => onSlotClick(room.id, slot)}
                                            title={`Đặt phòng lúc ${format(slot, 'HH:mm')}`}
                                        />
                                    ))}
                                </div>

                                {/* Bookings Render Layer */}
                                <div className="h-full w-full relative z-10 pointer-events-none p-2">
                                    {bookings
                                        .filter(b => b.roomId === room.id && isSameDay(new Date(b.startDatetime), date))
                                        .map(booking => {
                                            const isPrivate = booking.isPrivate || booking.title === 'Lịch riêng tư (Private)';
                                            const isRecurring = !!booking.recurringGroupId;
                                            return (
                                                <TooltipProvider key={booking.id}>
                                                    <Tooltip delayDuration={0}>
                                                        <TooltipTrigger asChild>
                                                            <div
                                                                className={cn(
                                                                    "absolute top-2 bottom-2 rounded-md border px-2 py-1 text-xs font-medium cursor-pointer transition-all hover:shadow-md pointer-events-auto overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-2",
                                                                    isPrivate
                                                                        ? "bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-950/50 dark:border-orange-800 dark:text-orange-300"
                                                                        : "bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300"
                                                                )}
                                                                style={getBookingStyle(booking)}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onBookingClick(booking);
                                                                }}
                                                            >
                                                                {isPrivate && <Lock className="h-3 w-3 shrink-0" />}
                                                                {isRecurring && !isPrivate && <Repeat className="h-3 w-3 shrink-0 text-teal-500" />}
                                                                <span className="truncate">
                                                                    {isPrivate
                                                                        ? `🔒 Riêng tư — ${booking.organizer ? `${booking.organizer.lastName || ''} ${booking.organizer.firstName || ''}`.trim() : 'N/A'}`
                                                                        : booking.title
                                                                    }
                                                                </span>

                                                                {/* User Avatar if enough width */}
                                                                {booking.organizer && !isPrivate && (
                                                                    <div className="ml-auto shrink-0 hidden sm:block">
                                                                        <Avatar className="h-5 w-5 border border-white">
                                                                            <AvatarFallback className="text-[9px] bg-blue-200 text-blue-800">
                                                                                {booking.organizer.firstName?.[0]}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="z-50">
                                                            <div className="text-sm font-semibold mb-1">
                                                                {isPrivate ? '🔒 Lịch riêng tư' : booking.title}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {format(new Date(booking.startDatetime), 'HH:mm')} - {format(new Date(booking.endDatetime), 'HH:mm')}
                                                            </div>
                                                            {booking.organizer && (
                                                                <div className="text-xs text-muted-foreground mt-1 font-medium">
                                                                    Liên hệ: {booking.organizer.lastName} {booking.organizer.firstName}
                                                                </div>
                                                            )}
                                                            {isRecurring && (
                                                                <div className="text-xs text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-1">
                                                                    <Repeat className="h-3 w-3" />
                                                                    Lịch lặp lại ({booking.recurringRule === 'DAILY' ? 'Hàng ngày' : booking.recurringRule === 'WEEKLY' ? 'Hàng tuần' : 'Hàng tháng'})
                                                                </div>
                                                            )}
                                                            {onDeleteBooking && currentEmployeeId === booking.organizerEmployeeId && (
                                                                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
                                                                    <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={(e) => { e.stopPropagation(); onBookingClick(booking); }}>
                                                                        <Pencil className="h-3 w-3 mr-1" /> Sửa
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isRecurring) {
                                                                            setDeleteConfirm({ booking, mode: 'ask' });
                                                                        } else {
                                                                            setDeleteConfirm({ booking, mode: 'single' });
                                                                        }
                                                                    }}>
                                                                        <Trash2 className="h-3 w-3 mr-1" /> Xoá
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {deleteConfirm?.mode === 'ask' ? 'Xóa lịch lặp lại' : 'Xác nhận xóa'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {deleteConfirm?.mode === 'ask'
                            ? `Lịch "${deleteConfirm?.booking.title}" thuộc chuỗi lặp lại. Bạn muốn xóa chỉ buổi này hay toàn bộ chuỗi?`
                            : `Bạn có chắc chắn muốn xóa lịch "${deleteConfirm?.booking.title}"?`
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    {deleteConfirm?.mode === 'ask' ? (
                        <>
                            <AlertDialogAction
                                className="bg-orange-600 hover:bg-orange-700"
                                onClick={() => {
                                    if (deleteConfirm?.booking && onDeleteBooking) {
                                        onDeleteBooking(deleteConfirm.booking.id, false);
                                    }
                                    setDeleteConfirm(null);
                                }}
                            >
                                Chỉ buổi này
                            </AlertDialogAction>
                            <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => {
                                    if (deleteConfirm?.booking && onDeleteBooking) {
                                        onDeleteBooking(deleteConfirm.booking.id, true);
                                    }
                                    setDeleteConfirm(null);
                                }}
                            >
                                Xóa cả chuỗi
                            </AlertDialogAction>
                        </>
                    ) : (
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                                if (deleteConfirm?.booking && onDeleteBooking) {
                                    onDeleteBooking(deleteConfirm.booking.id, false);
                                }
                                setDeleteConfirm(null);
                            }}
                        >
                            Xóa
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
    );
}
