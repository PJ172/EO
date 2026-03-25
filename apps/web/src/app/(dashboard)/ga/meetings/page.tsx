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
import { BookingTimeline } from '@/components/bookings/booking-timeline';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart2, CalendarDays, Plus, CalendarCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Calendar, Clock, ChevronLeft, ChevronRight, Lock, Globe } from 'lucide-react';
import { RoomBooking } from '@/services/booking.service';
import { PageHeader } from '@/components/ui/page-header';

// --- Helpers ---

const generateTimeOptions = (step = 15) => {
    const options = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += step) {
            const hour = h.toString().padStart(2, '0');
            const minute = m.toString().padStart(2, '0');
            options.push(`${hour}:${minute}`);
        }
    }
    return options;
};

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
    const [viewType, setViewType] = useState<'calendar' | 'timeline'>('timeline');
    const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

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
    const { data: bookings } = useBookings(undefined, from, to);

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

    // Initialize selected rooms once data loads
    // Initialize selected rooms once data loads



    const handleEventDoubleClick = (event: any) => {
        if (user?.employee?.id === event.organizerEmployeeId) {
            router.push('/bookings/' + event.id + '/edit');
        } else {
            toast.error('Bạn không có quyền chỉnh sửa lịch này');
        }
    };

    // Slot Selection
    // Slot Selection
    const [focusedSlot, setFocusedSlot] = useState<Date | null>(null);
    const lastClickTimeRef = useRef<number>(0);

    const handleOpenBookingModal = ({ start, roomId }: { start: Date; roomId?: string }) => {
        let url = `/bookings/new?date=${format(start, 'yyyy-MM-dd')}`;
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
        router.push('/bookings/new');
    }

    // Filter displayed bookings (Moved here to have access to all state)
    // Filter displayed bookings (Moved here to have access to all state)
    const filteredBookings = useMemo(() => {
        if (!bookings) return [];
        return bookings.filter(b => selectedRooms.includes(b.roomId));
    }, [bookings, selectedRooms]);

    return (
        <>
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 mx-2 mt-2">
                <PageHeader
                    title="PHÒNG HỌP"
                    titleClassName="from-blue-500 to-cyan-600 dark:from-blue-400 dark:to-cyan-400"
                    icon={
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-blue-500 to-cyan-600">
                            <CalendarCheck className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                        </div>
                    }
                    className="mb-0 border-none bg-transparent p-0 shadow-none"
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
                    className="hidden md:flex"
                />

                {/* Main Calendar Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-background h-full">
                    {/* Header with View Switcher for both Desktop and Mobile */}
                    <div className="p-3 border-b flex justify-between items-center bg-card shadow-sm z-10 sticky top-0">
                        <div className="flex items-center gap-2">
                            <Tabs value={viewType} onValueChange={(v) => setViewType(v as any)} className="w-[180px] md:w-[220px]">
                                <TabsList className="grid grid-cols-2 h-8 p-1 bg-muted/80">
                                    <TabsTrigger value="calendar" className="text-[11px] md:text-xs gap-1.5 data-[state=active]:bg-background">
                                        <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
                                        <span>Lịch</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="timeline" className="text-[11px] md:text-xs gap-1.5 data-[state=active]:bg-background">
                                        <BarChart2 className="h-3.5 w-3.5 rotate-90 text-indigo-500" />
                                        <span>Gantt</span>
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleNewBooking} className="h-8 gap-1 shadow-sm bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="h-3.5 w-3.5" />
                                <span className="">Đặt phòng</span>
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 p-0 md:p-4 overflow-hidden h-full">
                        <div className="h-full w-full rounded-lg md:border bg-background shadow-sm overflow-hidden flex flex-col">
                            {viewType === 'calendar' ? (
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
                            ) : (
                                <BookingTimeline
                                    rooms={rooms || []}
                                    bookings={filteredBookings || []}
                                    date={date}
                                    onSlotClick={(roomId, time) => handleOpenBookingModal({ start: time, roomId })}
                                    onBookingClick={(booking) => {
                                        if (user?.employee?.id === booking.organizerEmployeeId) {
                                            router.push('/bookings/' + booking.id + '/edit');
                                        } else {
                                            toast.info(`Sự kiện: ${booking.title}`);
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking Action Button Mobile */}
            <Button onClick={handleNewBooking} className="md:hidden absolute bottom-4 right-4 shadow-xl rounded-full h-14 w-14 z-50 p-0 text-2xl">
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
