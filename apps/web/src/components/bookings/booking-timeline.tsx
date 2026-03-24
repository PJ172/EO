import { useRef, useMemo } from 'react';
import { format, addMinutes, differenceInMinutes, startOfDay, setHours, setMinutes, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { RoomBooking } from '@/services/booking.service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Users, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BookingTimelineProps {
    rooms: any[];
    bookings: RoomBooking[];
    date: Date;
    onSlotClick: (roomId: string, time: Date) => void;
    onBookingClick: (booking: RoomBooking) => void;
}

const START_HOUR = 7;
const END_HOUR = 19; // 7 PM
const SLOT_DURATION = 30; // 30 minutes
const PIXELS_PER_MINUTE = 2; // Width scale
const SLOT_WIDTH = SLOT_DURATION * PIXELS_PER_MINUTE; // 60px per 30 mins

export function BookingTimeline({ rooms, bookings, date, onSlotClick, onBookingClick }: BookingTimelineProps) {
    // Generate Time Slots
    const timeSlots = useMemo(() => {
        const slots = [];
        let currentTime = setMinutes(setHours(startOfDay(date), START_HOUR), 0);
        const endTime = setMinutes(setHours(startOfDay(date), END_HOUR), 0);

        while (currentTime <= endTime) {
            slots.push(currentTime);
            currentTime = addMinutes(currentTime, SLOT_DURATION);
        }
        return slots;
    }, [date]);

    // Calculate Position Style
    const getBookingStyle = (booking: RoomBooking) => {
        const start = new Date(booking.startDatetime);
        const end = new Date(booking.endDatetime);

        // Base time for calculation (7:00 AM)
        const baseTime = setMinutes(setHours(startOfDay(date), START_HOUR), 0);

        const startDiff = differenceInMinutes(start, baseTime);
        const duration = differenceInMinutes(end, start);

        return {
            left: `${startDiff * PIXELS_PER_MINUTE}px`,
            width: `${duration * PIXELS_PER_MINUTE}px`,
        };
    };

    return (
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
                {rooms.map(room => (
                    <div key={room.id} className="flex border-b last:border-b-0 min-h-[80px] group">
                        {/* Room Info Sticky Column */}
                        <div className="w-48 shrink-0 border-r-2 border-r-primary/20 p-4 bg-background sticky left-0 z-[5] flex flex-col justify-center group-hover:bg-slate-50 transition-colors shadow-[4px_0_12px_-4px_rgba(0,0,0,0.15)]">
                            <div className="font-semibold text-sm text-foreground">{room.name}</div>
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
                                    const startHour = setMinutes(setHours(now, START_HOUR), 0);
                                    const diff = differenceInMinutes(now, startHour);
                                    // Only show if within range (7am - 7pm)
                                    if (diff >= 0 && diff <= (END_HOUR - START_HOUR) * 60) {
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
                                        const isPrivate = booking.title === 'Lịch riêng tư (Private)';
                                        return (
                                            <TooltipProvider key={booking.id}>
                                                <Tooltip delayDuration={0}>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            className={cn(
                                                                "absolute top-2 bottom-2 rounded-md border px-2 py-1 text-xs font-medium cursor-pointer transition-all hover:shadow-md pointer-events-auto overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-2",
                                                                isPrivate
                                                                    ? "bg-orange-100 border-orange-200 text-orange-700"
                                                                    : "bg-blue-100 border-blue-200 text-blue-700"
                                                            )}
                                                            style={getBookingStyle(booking)}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onBookingClick(booking);
                                                            }}
                                                        >
                                                            {isPrivate && <Lock className="h-3 w-3 shrink-0" />}
                                                            <span className="truncate">{booking.title}</span>

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
                                                        <div className="text-sm font-semibold mb-1">{booking.title}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {format(new Date(booking.startDatetime), 'HH:mm')} - {format(new Date(booking.endDatetime), 'HH:mm')}
                                                        </div>
                                                        {booking.organizer && (
                                                            <div className="text-xs text-muted-foreground mt-1 font-medium">
                                                                Liên hệ: {booking.organizer.lastName} {booking.organizer.firstName}
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
                ))}
            </div>
        </div>
    );
}
