import { useState } from 'react';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Calendar as CalendarIcon, Pencil, User, User2, Monitor, Armchair, Info, Sparkles } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/auth-context';
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
    onAddRoom?: () => void;
    onEditRoom?: (room: any) => void;
    showMyOnly?: boolean;
    onToggleMyOnly?: () => void;
    todayBookings?: any[]; // [H4] Nhận từ parent, tránh double API call
}

export function BookingSidebar({ date, setDate, className, rooms = [], selectedRooms = [], onToggleRoom, onNewBooking, onShowReport, onAddRoom, onEditRoom, showMyOnly = false, onToggleMyOnly, todayBookings }: BookingSidebarProps) {
    const [isCalendarsOpen, setIsCalendarsOpen] = useState(true);
    const [month, setMonth] = useState<Date>(new Date());
    const { user, checkPermission } = useAuth();
    const canCreate = checkPermission('ROOM_CREATE');
    const canUpdate = checkPermission('ROOM_UPDATE');

    // [H4] Dùng todayBookings từ parent — không cần fetch riêng
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
        <div className={cn("w-[280px] flex-shrink-0 flex flex-col gap-4 p-4 border-r bg-background/80 backdrop-blur-xl", className)}>
            {/* ─── MINI CALENDAR — Premium Redesign ─── */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] overflow-hidden">

                {/* Month Header — custom, not DayPicker's */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-wide">
                        {new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(month)}
                    </span>
                    <div className="flex items-center gap-0.5">
                        <button
                            type="button"
                            onClick={() => {
                                const prev = new Date(month);
                                prev.setMonth(prev.getMonth() - 1);
                                setMonth(prev);
                            }}
                            className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all duration-150 cursor-pointer"
                        >
                            <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const next = new Date(month);
                                next.setMonth(next.getMonth() + 1);
                                setMonth(next);
                            }}
                            className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all duration-150 cursor-pointer"
                        >
                            <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                        </button>
                    </div>
                </div>

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
                    className="p-0 w-full px-4 pb-4"
                    formatters={{
                        formatWeekdayName: (date) => {
                            const day = date.getDay();
                            if (day === 0) return 'CN';
                            return `T${day + 1}`;
                        }
                    }}
                    classNames={{
                        months: 'w-full',
                        month: 'space-y-1.5 w-full',
                        month_caption: 'hidden', // hidden — we render our own header above
                        caption_label: 'hidden',
                        nav: 'hidden',
                        weekdays: 'grid grid-cols-7 w-full mb-1',
                        weekday: 'text-slate-400 dark:text-slate-500 font-semibold text-[10px] text-center uppercase tracking-wide h-7 flex items-center justify-center',
                        week: 'grid grid-cols-7 w-full',
                        day: 'h-[34px] text-center text-sm p-0 relative flex items-center justify-center',
                        day_button: cn(
                            'h-[34px] w-[34px] p-0 font-normal text-sm rounded-xl text-slate-700 dark:text-slate-300',
                            'hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300',
                            'transition-all duration-150 cursor-pointer aria-selected:font-bold focus:outline-none'
                        ),
                        selected: 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white rounded-xl shadow-[0_2px_8px_0_rgba(37,99,235,0.4)]',
                        today: 'text-blue-600 dark:text-blue-400 font-bold',
                        outside: 'text-slate-300 dark:text-slate-600 opacity-50',
                        disabled: 'text-slate-300 dark:text-slate-600 opacity-40 cursor-not-allowed',
                        hidden: 'invisible',
                    }}
                    components={{
                        Chevron: () => <></> // hidden — using custom navigation
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

            {/* My Bookings Filter */}
            <Button
                className={cn(
                    "w-full justify-start gap-2 transition-colors",
                    showMyOnly
                        ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800"
                        : ""
                )}
                variant="outline"
                onClick={onToggleMyOnly}
            >
                <User2 className="h-4 w-4" />
                {showMyOnly ? 'Lịch của tôi' : 'Tất cả lịch'}
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
                    <div className="space-y-1.5 pl-1">
                        {rooms.map(room => {
                            const status = getRoomStatus(room.id);
                            return (
                                <div key={room.id} className="flex items-center space-x-2.5 group/item rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors py-1.5 px-1.5 -ml-1.5">
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
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <div className="h-5 w-1 rounded-full shrink-0" style={{ backgroundColor: room.color || '#3b82f6' }} />
                                                        <div className="flex flex-col truncate min-w-0 flex-1">
                                                            <Label
                                                                htmlFor={`room-${room.id}`}
                                                                className="text-sm font-medium cursor-pointer truncate text-foreground leading-tight"
                                                                title={room.name}
                                                            >
                                                                {room.name}
                                                            </Label>
                                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                <User className="h-2.5 w-2.5" /> {room.capacity} chỗ
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Status Dot with Animation */}
                                                    <div className="relative shrink-0 ml-2">
                                                        <div
                                                            className={cn(
                                                                "h-2.5 w-2.5 rounded-full",
                                                                status.status === 'booked' ? "bg-red-500" : "bg-green-500"
                                                            )}
                                                            title={status.label}
                                                        />
                                                        {status.status === 'booked' && (
                                                            <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-red-400 animate-ping opacity-75" />
                                                        )}
                                                    </div>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="w-[380px] p-0 overflow-hidden border bg-background/95 backdrop-blur-2xl shadow-2xl rounded-xl z-50 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 duration-200">
                                                <div className="flex flex-col">
                                                    {/* Image Section */}
                                                    <div className="h-48 w-full bg-slate-100 dark:bg-slate-800 relative group overflow-hidden">
                                                        {room.image ? (
                                                            <img
                                                                src={room.image}
                                                                alt={room.name}
                                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                <Monitor className="h-12 w-12 opacity-20" />
                                                            </div>
                                                        )}

                                                        {/* Gradient Overlay for Text Readability */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

                                                        {/* Status Badge */}
                                                        <div className={cn(
                                                            "absolute top-3 right-3 px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase text-white shadow-xl backdrop-blur-md border border-white/20",
                                                            status.status === 'booked' ? "bg-red-500/90" : "bg-emerald-500/90"
                                                        )}>
                                                            {status.label}
                                                        </div>

                                                        {/* Floating Room Info on Image */}
                                                        <div className="absolute bottom-4 left-5 right-5 text-white">
                                                            <h4 className="font-bold text-lg leading-tight dropshadow-md">{room.name}</h4>
                                                            <div className="flex items-center gap-1.5 text-xs text-white/90 mt-1.5 font-medium">
                                                                <User className="h-3.5 w-3.5" />
                                                                <span>{room.capacity} người</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Details Section */}
                                                    <div className="p-5 bg-white text-gray-800 dark:bg-gray-950 dark:text-gray-100 flex flex-col gap-4">
                                                        {room.description && (
                                                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                                {room.description}
                                                            </p>
                                                        )}

                                                        {(room.equipment?.length > 0 || room.features?.length > 0) && (
                                                            <div className="space-y-4">
                                                                {room.equipment && room.equipment.length > 0 && (
                                                                    <div className="space-y-2">
                                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thiết bị</span>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {room.equipment.map((item: string, i: number) => (
                                                                                <span key={i} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-1 rounded font-medium text-[11px] border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                                                                                    <Monitor className="h-3 w-3" />{item}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {room.features && room.features.length > 0 && (
                                                                    <div className="space-y-2">
                                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đặc điểm</span>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {room.features.map((item: string, i: number) => (
                                                                                <span key={i} className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-1 rounded font-medium text-[11px] border border-amber-200 dark:border-amber-800/60 shadow-sm">
                                                                                    <Sparkles className="h-3 w-3" />{item}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
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
