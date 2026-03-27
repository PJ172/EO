
import { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isSameDay, isToday, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { RoomBooking } from '@/services/booking.service';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, BarChart, Clock, MapPin, AlignLeft, Video, MessageSquare } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";



import "./calendar-custom.css"; // We will create this for custom overrides

const locales = {
    'vi': vi,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface CalendarViewProps {
    bookings: RoomBooking[];
    date: Date;
    onDateChange: (date: Date) => void;
    view: View;
    onViewChange: (view: View) => void;
    onSelectEvent: (event: RoomBooking) => void;
    onSelectSlot: (slotInfo: any) => void;
    onDoubleClickEvent?: (event: RoomBooking) => void;
    slotPropGetter?: (date: Date) => any;
    dayPropGetter?: (date: Date) => any;
    rooms?: any[];
    onNewBooking?: () => void;
    onShowReport?: () => void;
}

const ROOM_COLORS = [
    '#2563eb', // Blue 600
    '#059669', // Emerald 600
    '#d97706', // Amber 600
    '#dc2626', // Red 600
    '#7c3aed', // Violet 600
    '#db2777', // Pink 600
    '#0891b2', // Cyan 600
    '#65a30d', // Lime 600
];

// Custom Agenda Components (Static)
const AgendaDate = ({ label, day }: any) => {
    if (!day) return null;
    const dateObj = new Date(day);
    if (isNaN(dateObj.getTime())) return null;

    return (
        <div className="flex flex-col items-center justify-center p-2 text-gray-600 dark:text-gray-300 min-w-[60px]">
            <span className="text-xl font-bold">{format(dateObj, 'dd')}</span>
            <span className="text-xs uppercase tracking-wide">{format(dateObj, 'EEE', { locale: vi })}</span>
        </div>
    );
};

const AgendaTime = ({ event }: any) => {
    if (!event || !event.start || !event.end) return <span className="text-red-500">Invalid Time</span>;
    return (
        <div className="text-sm font-medium text-gray-500 whitespace-nowrap p-2">
            {format(new Date(event.start), 'HH:mm')} - {format(new Date(event.end), 'HH:mm')}
        </div>
    );
};

export function CalendarView({
    bookings,
    date,
    onDateChange,
    view,
    onViewChange,
    onSelectEvent,
    onSelectSlot,
    onDoubleClickEvent,
    slotPropGetter,
    dayPropGetter,
    rooms = [],
    onNewBooking,
    onShowReport
}: CalendarViewProps) {

    // Map RoomBooking to Calendar Event
    const events = useMemo(() => {
        return bookings.map(b => ({
            id: b.id,
            title: b.title,
            start: new Date(b.startDatetime),
            end: new Date(b.endDatetime),
            resource: b,
            roomId: b.roomId,
            isPrivate: b.title === 'Lịch riêng tư (Private)'
        }));
    }, [bookings]);

    // [H6] Precompute color map — O(1) lookup thay vì O(n) findIndex mỗi event
    const roomColorMap = useMemo(() =>
        Object.fromEntries(
            rooms.map((r, i) => [r.id, r.color || ROOM_COLORS[i % ROOM_COLORS.length]])
        )
    , [rooms]);

    // Custom Agenda Event (Dynamic)
    const AgendaEvent = useCallback(({ event, title }: any) => {
        if (!event || !event.resource) {
            return <div className="p-2 text-red-500">Error: Missing event data</div>;
        }

        const roomId = event.resource.roomId;
        const roomName = event.resource.room?.name || 'Phòng ?';
        const displayTitle = title || event.title || 'Không có tiêu đề';
        // [H6] O(1) lookup
        const color = roomColorMap[roomId] || '#3b82f6';

        const isPrivate = event.resource.isPrivate;
        const organizer = event.resource.organizer;

        return (
            <div className="flex items-start gap-4 p-3 hover:bg-gray-50 transition-colors w-full border-l-4 rounded-r-md shadow-sm bg-white border border-gray-100 my-1"
                style={{ borderLeftColor: color }}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-black truncate text-base">{displayTitle}</h3>
                        {isPrivate && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full border">Riêng tư</span>}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                            <span className="truncate font-medium text-gray-700">{roomName}</span>
                        </div>
                        {organizer && (
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Avatar className="h-5 w-5 border border-gray-200">
                                    <AvatarFallback className="text-[9px] bg-blue-50 text-blue-700 font-bold">{organizer.fullName?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="truncate">{organizer.fullName}</span>
                            </div>
                        )}
                    </div>
                    {event.resource.description && (
                        <div className="text-xs text-gray-500 mt-2 line-clamp-1 flex items-center gap-1">
                            <AlignLeft className="h-3 w-3 shrink-0" />
                            {event.resource.description}
                        </div>
                    )}
                </div>
            </div>
        );
    }, [roomColorMap]); // [H5] Stable: depends only on roomColorMap, not rooms array ref


    // [H5] Stable eventPropGetter — useCallback + [H6] O(1) color lookup
    const eventPropGetter = useCallback((event: any) => {
        const color = roomColorMap[event.resource?.roomId] || '#3b82f6';

        if (view === Views.AGENDA) {
            return {
                style: {
                    backgroundColor: 'transparent',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer'
                }
            };
        }

        return {
            style: {
                backgroundColor: color,
                borderColor: 'transparent',
                borderRadius: '4px',
                opacity: 0.9,
                color: '#fff',
                border: '0px',
                display: 'block',
                fontSize: '0.75rem'
            }
        };
    }, [roomColorMap, view]);


    // [H5] Stable ref — defined outside render cycle with useCallback
    const CustomDateHeader = useCallback(({ date, label }: any) => {
        const isTodayDate = isToday(date);
        return (
            <div className="w-full flex justify-end px-1.5 pt-1 pb-0.5">
                <span
                    className={cn(
                        "h-6 w-6 inline-flex items-center justify-center rounded-full text-xs font-medium leading-none",
                        isTodayDate
                            ? "bg-red-500 text-white"
                            : "text-foreground"
                    )}
                >
                    {label}
                </span>
            </div>
        );
    }, []);


    // [H5] Wrapped Toolbar — stable via useCallback, not recreated on every render
    const CustomToolbar = useCallback((toolbar: any) => {
        const viewButtons = [
            { key: Views.DAY, label: 'Ngày' },
            { key: Views.WEEK, label: 'Tuần' },
            { key: Views.MONTH, label: 'Tháng' },
            { key: Views.AGENDA, label: 'Lịch của tôi' },
        ];
        return (
            <div className="flex items-center justify-between py-2.5 px-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                        <Button type="button" variant="ghost" size="icon" onClick={() => toolbar.onNavigate('PREV')} className="h-7 w-7 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer">
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => toolbar.onNavigate('TODAY')} className="h-7 px-3 rounded-md text-xs font-medium hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer">
                            Hôm nay
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => toolbar.onNavigate('NEXT')} className="h-7 w-7 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer">
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <h2 className="text-base font-semibold tracking-tight text-slate-700 dark:text-slate-200">{toolbar.label}</h2>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                        {viewButtons.map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => toolbar.onView(key)}
                                className={cn(
                                    "h-7 px-3 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer",
                                    toolbar.view === key
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60"
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <Button size="sm" variant="outline" onClick={onShowReport} className="h-7 gap-1.5 text-xs hidden md:flex border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <BarChart className="h-3 w-3" />
                        Báo cáo
                    </Button>
                </div>
            </div>
        );
    }, [onShowReport]);


    // [H5] EventComponent — stable via useCallback, no remount on every render
    const EventComponent = useCallback(({ event }: any) => {
        const isPrivate = event.isPrivate;
        const roomName = event.resource.room?.name || 'Phòng ?';
        const title = event.title;

        return (
            <Popover>
                <PopoverTrigger asChild>
                    <div
                        className={cn(
                            "h-full w-full p-0.5 text-xs overflow-hidden rounded-sm flex flex-col hover:bg-black/10 transition-colors cursor-pointer",
                        )}
                        title={`${title}\nPhòng: ${roomName}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="font-semibold truncate leading-tight text-[11px]">{title}</div>
                        {view !== 'month' && !isPrivate && (
                            <div className="text-[10px] opacity-90 truncate mt-0.5 flex items-center">
                                {roomName}
                            </div>
                        )}
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start" side="right" onClick={(e) => e.stopPropagation()}>
                    <div className="p-4 space-y-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold leading-none">{event.title}</h4>
                            <div className="text-xs text-muted-foreground">{roomName}</div>
                        </div>

                        <Separator />

                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    {format(new Date(event.start), 'EEEE, dd/MM HH:mm', { locale: vi })} - {format(new Date(event.end), 'HH:mm')}
                                </div>
                            </div>

                            <div className="flex items-start gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[10px]">{event.resource.organizer?.fullName?.[0] || '?'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium text-xs">
                                        {event.resource.organizer ?
                                            `${event.resource.organizer.fullName || ''}`.trim() || 'Người dùng'
                                            : 'Người dùng'}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">Người tổ chức</div>
                                </div>
                            </div>

                            {event.resource.description && (
                                <div className="flex items-start gap-2 pt-2 border-t text-muted-foreground">
                                    <AlignLeft className="h-4 w-4 mt-0.5 shrink-0" />
                                    <p className="text-xs whitespace-pre-wrap line-clamp-4">{event.resource.description}</p>
                                </div>
                            )}

                            {event.resource.note && (
                                <div className="flex items-start gap-2 pt-2 border-t text-yellow-600">
                                    <p className="text-xs italic">Ghi chú: {event.resource.note}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }, [view]); // [H5] Only re-create when view changes (month vs non-month display logic)


    const components = useMemo(() => ({
        toolbar: CustomToolbar,
        event: EventComponent,
        month: { dateHeader: CustomDateHeader },
        agenda: { date: AgendaDate, time: AgendaTime, event: AgendaEvent }
    // [H5] Stable: CustomToolbar/EventComponent/CustomDateHeader are now useCallback-wrapped
    }), [CustomToolbar, EventComponent, CustomDateHeader, AgendaEvent]);


    // Manual Label Generator for Timeline View
    const getLabel = (d: Date, v: View) => {
        if (v === 'month') return format(d, 'MMMM yyyy', { locale: vi });
        if (v === 'day') return format(d, 'EEEE, d MMMM yyyy', { locale: vi });
        if (v === 'week') {
            const start = startOfWeek(d, { locale: vi });
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return `${format(start, 'd MMM', { locale: vi })} - ${format(end, 'd MMM yyyy', { locale: vi })}`;
        }
        return format(d, 'MMMM yyyy', { locale: vi });
    }




    // Force Agenda to start from Monday and show 7 days
    const displayDate = useMemo(() => {
        if (view === Views.AGENDA) {
            return startOfWeek(date, { locale: vi });
        }
        return date;
    }, [date, view]);

    const formats = useMemo(() => ({
        agendaHeaderFormat: ({ start, end }: any, culture: any, local: any) => {
            // RBC returns exclusive end date (start + length). We want inclusive (Mon-Sun).
            const inclusiveEnd = subDays(new Date(end), 1);
            return local.format(start, 'dd/MM/yyyy', culture) + ' – ' + local.format(inclusiveEnd, 'dd/MM/yyyy', culture);
        }
    }), []);

    return (
        <div className="h-full w-full bg-background text-foreground [&_.rbc-calendar]:font-sans flex flex-col">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                date={displayDate}
                formats={formats}
                onNavigate={onDateChange}
                view={view as View}
                onView={(v) => onViewChange(v)}
                selectable
                onSelectEvent={(e) => onSelectEvent(e.resource)}
                onDoubleClickEvent={(e) => onDoubleClickEvent && onDoubleClickEvent(e.resource)}
                onSelectSlot={onSelectSlot}
                eventPropGetter={eventPropGetter}
                slotPropGetter={slotPropGetter}
                dayPropGetter={dayPropGetter}
                components={components}
                length={7}
                messages={{
                    date: 'Ngày',
                    time: 'Thời gian',
                    event: 'Sự kiện',
                    allDay: 'Cả ngày',
                    week: 'Tuần',
                    work_week: 'Tuần làm việc',
                    day: 'Ngày',
                    month: 'Tháng',
                    previous: 'Trước',
                    next: 'Sau',
                    yesterday: 'Hôm qua',
                    tomorrow: 'Ngày mai',
                    today: 'Hôm nay',
                    agenda: 'Lịch của tôi',
                    noEventsInRange: 'Không có sự kiện nào trong khoảng thời gian này.',
                    showMore: (total) => `+${total} thêm`,
                }}
                popup
                culture='vi'
                scrollToTime={new Date(0, 0, 0, 7, 0, 0)}
            />
        </div>
    );
}
