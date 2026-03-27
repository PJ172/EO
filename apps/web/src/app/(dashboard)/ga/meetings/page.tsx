'use client';

import { useState, useMemo, useEffect, useRef } from 'react'; // Add useRef
import { useQueryClient } from '@tanstack/react-query';
import { useRooms, useBookings, useCreateBooking, useUpdateBooking, useDeleteBooking } from '@/hooks/useBookings';
import { useAuth } from '@/contexts/auth-context';
import { useEmployees } from '@/hooks/useEmployees';
import { BookingSidebar } from '@/components/bookings/booking-sidebar';
import { CalendarView } from '@/components/bookings/calendar-view';
import { BookingReportDialog } from '@/components/bookings/booking-report-dialog';
import { RoomDialog } from '@/components/bookings/room-dialog';
import { Views, View } from 'react-big-calendar';
import { format, addMinutes, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, isToday, isSameDay, parse } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { MultiSelect } from '@/components/ui/multi-select';
import { DatePicker } from '@/components/ui/date-picker';
import { Plus, CalendarCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Calendar, Clock, ChevronLeft, ChevronRight, Lock, Globe } from 'lucide-react';
import { RoomBooking } from '@/services/booking.service';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';

// [M9] Module-level constant — tính 1 lần duy nhất khi module load, không tái tính mỗi render
const TIME_OPTIONS_15MIN = (() => {
    const options: string[] = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }
    return options;
})();

function TimePicker({ value, onChange, options }: { value: string, onChange: (val: string) => void, options: string[] }) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-mono h-9">
                    {value ? value : "00:00"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[120px] p-0">
                <Command>
                    <CommandInput placeholder="Tìm..." className="h-9" />
                    <CommandList>
                        <CommandEmpty>Trống.</CommandEmpty>
                        <CommandGroup>
                            {options.map((time) => (
                                <CommandItem
                                    key={time}
                                    value={time}
                                    onSelect={(currentValue) => {
                                        onChange(currentValue);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", value === time ? "opacity-100" : "opacity-0")} />
                                    {time}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

// --- Main Page Component ---

export default function BookingsPage() {
    const { data: rooms } = useRooms();

    // View State
    const [date, setDate] = useState<Date>(new Date());
    const [view, setView] = useState<View>(Views.MONTH);
    const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
    const [showMyOnly, setShowMyOnly] = useState(false);

    // Derived date range for query
    const { from, to } = useMemo(() => {
        let fromDate = new Date(date);
        let toDate = new Date(date);

        if (view === Views.MONTH) {
            fromDate = startOfWeek(startOfMonth(date), { locale: vi });
            toDate = endOfWeek(endOfMonth(date), { locale: vi });
        } else if (view === Views.WEEK || view === Views.WORK_WEEK || view === Views.AGENDA) {
            fromDate = startOfWeek(date, { locale: vi });
            toDate = endOfWeek(date, { locale: vi });
        } else {
            fromDate = startOfDay(date);
            toDate = endOfDay(date);
        }

        return {
            from: fromDate.toISOString(),
            to: toDate.toISOString()
        }
    }, [date, view]);

    // Data Fetching
    const { data: bookings, isLoading: isLoadingBookings } = useBookings(undefined, from, to);

    // [H4] today bookings for sidebar room-status indicators (shared, no extra API call)
    const todayFrom = useMemo(() => startOfDay(new Date()).toISOString(), []);
    const todayTo = useMemo(() => endOfDay(new Date()).toISOString(), []);
    const { data: todayBookings } = useBookings(undefined, todayFrom, todayTo);

    const handleToggleRoom = (roomId: string) => {
        setSelectedRooms(prev =>
            prev.includes(roomId)
                ? prev.filter(id => id !== roomId)
                : [...prev, roomId]
        );
    };

    // Booking Form State
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<any>(undefined);

    // Mutations
    const { user } = useAuth();
    const router = useRouter();
    const deleteBooking = useDeleteBooking();
    const queryClient = useQueryClient();

    // Initialize selected rooms once data loads
    // Initialize selected rooms once data loads



    const handleEventDoubleClick = (event: any) => {
        if (user?.employee?.id === event.organizerEmployeeId) {
            router.push('/ga/meetings/' + event.id + '/edit');
        } else {
            toast.error('Bạn không có quyền chỉnh sửa lịch này');
        }
    };

    // Slot Selection
    // Slot Selection
    const [focusedSlot, setFocusedSlot] = useState<Date | null>(null);
    const lastClickTimeRef = useRef<number>(0);

    const handleOpenBookingModal = ({ start, roomId }: { start: Date; roomId?: string }) => {
        let url = `/ga/meetings/new?date=${format(start, 'yyyy-MM-dd')}`;
        const now = new Date();
        const minutes = now.getMinutes();
        const remainder = minutes % 15;
        now.setMinutes(remainder === 0 ? minutes : minutes + (15 - remainder));
        now.setSeconds(0);
        url += `&startTime=${format(now, 'HH:mm')}&endTime=${format(addMinutes(now, 30), 'HH:mm')}`;
        if (roomId) url += `&roomId=${roomId}`;
        router.push(url);
    };

    const handleSelectSlot = (slotInfo: any) => {
        const now = Date.now();
        if (now - lastClickTimeRef.current < 300) {
            // Double Click
            handleOpenBookingModal({ start: slotInfo.start });
            setFocusedSlot(null);
        } else {
            // Single Click
            setFocusedSlot(slotInfo.start);
        }
        lastClickTimeRef.current = now;
    };

    const dayPropGetter = (date: Date) => {
        const isTodayDate = isToday(date);

        if (isTodayDate) {
            // Only Month view uses CSS class .rbc-today for styling
            // Week/Day views should not have extra border via inline style
            // We rely on CSS for Month view highlight
            return {};
        }

        if (focusedSlot && isSameDay(date, focusedSlot)) {
            return {
                style: {
                    backgroundColor: 'rgba(59, 130, 246, 0.1)', // Light blue for selected
                },
            };
        }

        return {};
    };



    const handleNewBooking = () => {
        router.push('/ga/meetings/new');
    }

    // Filter displayed bookings
    const filteredBookings = useMemo(() => {
        if (!bookings) return [];
        let result = bookings.filter(b => selectedRooms.includes(b.roomId));
        if (showMyOnly && user?.employee?.id) {
            result = result.filter(b =>
                b.organizerEmployeeId === user?.employee?.id ||
                b.attendees?.some((a: any) => a.employeeId === user?.employee?.id)
            );
        }
        return result;
    }, [bookings, selectedRooms, showMyOnly, user?.employee?.id]);

    return (
        <>
            <div className="bg-card/50 backdrop-blur-2xl border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-xl p-2 mx-2 mt-2">
                <PageHeader
                    title="PHÒNG HỌP"
                    titleClassName="from-blue-500 to-cyan-600 dark:from-blue-400 dark:to-cyan-400"
                    icon={
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-blue-500 to-cyan-600">
                            <CalendarCheck className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                        </div>
                    }
                    className="mb-0 border-none bg-transparent p-0 shadow-none"
                    actions={
                        <div className="flex items-center gap-3">
                            <Button size="sm" onClick={handleNewBooking} className="h-8 gap-1 shadow-sm bg-blue-600 hover:bg-blue-700 text-white transition-all hover:shadow-md active:scale-95">
                                <Plus className="h-3.5 w-3.5" />
                                <span>Đặt phòng</span>
                            </Button>
                        </div>
                    }
                />
            </div>
            <div className="flex h-[calc(100vh-5.5rem)] flex-col w-full overflow-hidden">

                <div className="flex flex-1 overflow-hidden h-full">
                {/* Sidebar */}
                <BookingSidebar
                    date={date}
                    setDate={setDate}
                    rooms={rooms || []}
                    selectedRooms={selectedRooms}
                    onToggleRoom={handleToggleRoom}
                    onNewBooking={handleNewBooking}
                    onShowReport={() => setIsReportOpen(true)}
                    onAddRoom={() => {
                        setEditingRoom(undefined);
                        setIsRoomDialogOpen(true);
                    }}
                    onEditRoom={(room) => {
                        setEditingRoom(room);
                        setIsRoomDialogOpen(true);
                    }}
                    showMyOnly={showMyOnly}
                    onToggleMyOnly={() => setShowMyOnly(!showMyOnly)}
                    todayBookings={todayBookings} // [H4] Pass shared data, no extra fetch
                    className="hidden md:flex"
                />

                {/* Main Calendar Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-background h-full">
                    <div className="flex-1 p-0 md:p-4 overflow-hidden h-full">
                        <div className="h-full w-full rounded-lg md:border bg-background/80 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
                            {isLoadingBookings ? (
                                <div className="p-6 space-y-4 animate-pulse">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="h-8 w-48" />
                                        <Skeleton className="h-8 w-32" />
                                    </div>
                                    <div className="grid grid-cols-7 gap-2">
                                        {Array.from({ length: 7 }).map((_, i) => (
                                            <Skeleton key={`h-${i}`} className="h-6" />
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-2">
                                        {Array.from({ length: 35 }).map((_, i) => (
                                            <Skeleton key={`c-${i}`} className="h-20 rounded-md" />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <CalendarView
                                    bookings={filteredBookings || []}
                                    date={date}
                                    onDateChange={setDate}
                                    view={view}
                                    onViewChange={setView}
                                    onSelectEvent={(event) => {}}
                                    onDoubleClickEvent={handleEventDoubleClick}
                                    onSelectSlot={handleSelectSlot}
                                    slotPropGetter={dayPropGetter}
                                    dayPropGetter={dayPropGetter}
                                    rooms={rooms}
                                    onNewBooking={handleNewBooking}
                                    onShowReport={() => setIsReportOpen(true)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking Action Button Mobile */}
            <Button onClick={handleNewBooking} className="md:hidden fixed bottom-6 right-6 shadow-xl rounded-full h-14 w-14 z-50 p-0 text-2xl bg-blue-600 hover:bg-blue-700 text-white hover:shadow-2xl transition-all active:scale-90 animate-in fade-in zoom-in duration-500">
                +
            </Button>
            {/* Booking Report Dialog */}
            <BookingReportDialog
                open={isReportOpen}
                onOpenChange={setIsReportOpen}
                bookings={filteredBookings || []}
                rooms={rooms || []}
            />

            {/* Room Dialog */}
            <RoomDialog
                open={isRoomDialogOpen}
                onOpenChange={setIsRoomDialogOpen}
                room={editingRoom}
            />
        </div>
        </>
    );
}
