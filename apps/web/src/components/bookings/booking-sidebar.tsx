import { useState } from 'react';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, ChevronDown, ChevronRight, ChevronUp, Calendar as CalendarIcon, Pencil, User, Monitor, Armchair, Info } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/auth-context';
import { useBookings } from '@/hooks/useBookings';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface BookingSidebarProps {
    date: Date;
    setDate: (date: Date) => void;
    className?: string;
    rooms?: any[];
    selectedRooms?: string[];
    onToggleRoom?: (roomId: string) => void;
    onNewBooking?: () => void;
    onShowReport?: () => void;
    onAddRoom?: () => void; // New prop
    onEditRoom?: (room: any) => void; // New prop
}

export function BookingSidebar({ date, setDate, className, rooms = [], selectedRooms = [], onToggleRoom, onNewBooking, onShowReport, onAddRoom, onEditRoom }: BookingSidebarProps) {
    const [isCalendarsOpen, setIsCalendarsOpen] = useState(true);
    const [month, setMonth] = useState<Date>(new Date());
    const { user, checkPermission } = useAuth(); // Get auth info
    const canCreate = checkPermission('ROOM_CREATE');
    const canUpdate = checkPermission('ROOM_UPDATE');

    // Fetch bookings for TODAY to determine real-time availability
    const today = new Date();
    const { data: todayBookings } = useBookings(
        undefined,
        startOfDay(today).toISOString(),
        endOfDay(today).toISOString()
    );

    const getRoomStatus = (roomId: string) => {
        if (!todayBookings) return { status: 'unknown', label: 'Đang tải...' };

        const now = new Date();
        const currentBooking = todayBookings.find(b =>
            b.roomId === roomId &&
            isWithinInterval(now, { start: new Date(b.startDatetime), end: new Date(b.endDatetime) })
        );

        if (currentBooking) {
            return { status: 'booked', label: 'Đang họp' };
        }
        return { status: 'available', label: 'Trống' };
    };

    return (
        <div className={cn("w-[280px] flex-shrink-0 flex flex-col gap-6 p-4 border-r bg-background", className)}>
            <div className="rounded-md w-full flex justify-center">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                        if (d) {
                            setDate(d);
                            setMonth(d);
                        }
                    }}
                    month={month}
                    onMonthChange={setMonth}
                    locale={vi}
                    className="p-0 w-full"
                    formatters={{
                        formatWeekdayName: (date) => {
                            const day = date.getDay();
                            if (day === 0) return "CN";
                            return `T${day + 1}`;
                        }
                    }}
                    classNames={{
                        month: "space-y-4 w-full",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex w-full mt-2 justify-between px-1",
                        row: "flex w-full mt-2 justify-between px-1",
                        head_cell: "text-muted-foreground w-8 font-normal text-[0.8rem]",
                        cell: "h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-transparent focus-within:relative focus-within:z-20",
                        day: cn(
                            buttonVariants({ variant: "ghost" }),
                            "h-8 w-8 p-0 font-normal aria-selected:opacity-100 rounded-full hover:bg-accent hover:text-accent-foreground"
                        ),
                        day_selected:
                            "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white shadow-sm rounded-full",
                        day_today: "text-blue-600 font-bold",
                        day_outside: "text-muted-foreground opacity-30",
                        day_disabled: "text-muted-foreground opacity-50",
                        day_hidden: "invisible",
                        caption: "flex justify-start pt-1 relative items-center w-full px-1",
                        caption_label: "text-sm font-bold text-foreground pl-9 ",
                        nav: "flex items-center gap 0 absolute right-46 top-1 h-7",
                        button_previous: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                        button_next: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    }}
                    components={{
                        Chevron: ({ orientation }) => {
                            const Icon = orientation === "left" ? ChevronUp : ChevronDown;
                            return <Icon className="h-4 w-4" />;
                        }
                    }}
                />
            </div>

            {/* Actions */}
            <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => {
                    const now = new Date();
                    setDate(now);
                    setMonth(now);
                }}
            >
                <CalendarIcon className="h-4 w-4" />
                Hôm nay
            </Button>


            {/* My Calendars Filter */}
            <div className="space-y-2">
                <div className="flex items-center justify-between space-x-4 px-1 group">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 justify-start p-0 hover:bg-transparent"
                        onClick={() => setIsCalendarsOpen(!isCalendarsOpen)}
                    >
                        {isCalendarsOpen ? (
                            <ChevronDown className="h-4 w-4 mr-2" />
                        ) : (
                            <ChevronRight className="h-4 w-4 mr-2" />
                        )}
                        <span className="font-semibold text-sm">Lịch phòng họp</span>
                    </Button>

                    {/* Add Room Button (Permission Check) */}
                    {canCreate && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddRoom?.();
                            }}
                            title="Thêm phòng mới"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                {isCalendarsOpen && (
                    <div className="space-y-2 pl-2">
                        {rooms.map(room => {
                            const status = getRoomStatus(room.id);
                            return (
                                <div key={room.id} className="flex items-center space-x-2 group/item">
                                    <Checkbox
                                        id={`room-${room.id}`}
                                        checked={selectedRooms.includes(room.id)}
                                        onCheckedChange={() => onToggleRoom && onToggleRoom(room.id)}
                                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    />

                                    <TooltipProvider delayDuration={200}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex-1 flex items-center justify-between cursor-pointer min-w-0">
                                                    <div className="flex flex-col truncate min-w-0 flex-1">
                                                        <Label
                                                            htmlFor={`room-${room.id}`}
                                                            className="text-sm font-medium cursor-pointer truncate text-foreground"
                                                            title={room.name}
                                                        >
                                                            {room.name}
                                                        </Label>
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <User className="h-2.5 w-2.5 text-blue-500" /> {room.capacity} chỗ
                                                        </span>
                                                    </div>

                                                    {/* Status Dot */}
                                                    <div
                                                        className={cn(
                                                            "h-2 w-2 rounded-full flex-shrink-0 ml-2",
                                                            status.status === 'booked' ? "bg-red-500" : "bg-green-500"
                                                        )}
                                                        title={status.label}
                                                    />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="w-[280px] p-0 overflow-hidden border">
                                                <div className="flex flex-col">
                                                    {/* Image */}
                                                    <div className="h-32 w-full bg-muted relative">
                                                        {room.image ? (
                                                            <img
                                                                src={room.image}
                                                                alt={room.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                                                <Monitor className="h-10 w-10 opacity-20" />
                                                            </div>
                                                        )}
                                                        <div className={cn(
                                                            "absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white shadow-sm",
                                                            status.status === 'booked' ? "bg-red-500" : "bg-green-500"
                                                        )}>
                                                            {status.label}
                                                        </div>
                                                    </div>

                                                    {/* Details */}
                                                    <div className="p-3 bg-white text-gray-800 dark:bg-gray-950 dark:text-gray-100">
                                                        <h4 className="font-bold text-sm mb-1">{room.name}</h4>
                                                        {room.description && <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{room.description}</p>}

                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <User className="h-3.5 w-3.5 text-blue-500" />
                                                                <span className="font-medium">Sức chứa:</span> {room.capacity} người
                                                            </div>
                                                            {room.equipment && room.equipment.length > 0 && (
                                                                <div className="flex items-start gap-2 text-xs">
                                                                    <Monitor className="h-3.5 w-3.5 text-indigo-500 mt-0.5" />
                                                                    <div>
                                                                        <span className="font-medium">Thiết bị:</span>
                                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                                            {room.equipment.map((item: string, i: number) => (
                                                                                <span key={i} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-[3px] border border-gray-200">
                                                                                    {item}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {room.features && room.features.length > 0 && (
                                                                <div className="flex items-start gap-2 text-xs">
                                                                    <Info className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
                                                                    <div>
                                                                        <span className="font-medium">Đặc điểm:</span>
                                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                                            {room.features.map((item: string, i: number) => (
                                                                                <span key={i} className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-[3px] border border-amber-100">
                                                                                    {item}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    {/* Edit Room Button (Permission Check) */}
                                    {canUpdate && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditRoom?.(room);
                                            }}
                                            title="Chỉnh sửa phòng"
                                        >
                                            <Pencil className="h-3 w-3 text-muted-foreground" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })}

                        {rooms.length === 0 && (
                            <div className="text-xs text-muted-foreground pl-6">Không có phòng nào</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
