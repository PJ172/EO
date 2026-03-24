"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useRooms, useCreateBooking, useUpdateBooking, useBookings } from "@/hooks/useBookings";
import { useAuth } from "@/contexts/auth-context";
import { useEmployees } from "@/hooks/useEmployees";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "@/components/ui/multi-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Calendar, Globe, Lock, Save, Plus, Clock, Search, Info, ChevronsUpDown, Check, Loader2, CalendarDays } from "lucide-react";
import { format, addMinutes, parse, startOfDay, endOfDay } from "date-fns";

const generateTimeOptions = (step = 15) => {
    const options = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += step) {
            const hour = h.toString().padStart(2, "0");
            const minute = m.toString().padStart(2, "0");
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
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-mono h-9 bg-background focus-visible:ring-1">
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

interface BookingFormProps {
    bookingId?: string | null;
    returnUrl?: string;
}

function BookingFormInternal({ bookingId, returnUrl = "/bookings" }: BookingFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [note, setNote] = useState("");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [roomId, setRoomId] = useState("");
    const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
    const [notify, setNotify] = useState(true);
    const [isPrivate, setIsPrivate] = useState(false);

    const isEditMode = !!bookingId;
    const { user } = useAuth();
    const { data: rooms } = useRooms();
    const { data: employeesData } = useEmployees({ limit: 1000 });
    const createBooking = useCreateBooking();
    const updateBooking = useUpdateBooking();

    const employeeOptions = employeesData?.data?.map((emp: any) => ({
        label: `${emp.employeeCode || ""} | ${emp.fullName} | ${emp.emailCompany || emp.email || "N/A"}`,
        value: emp.id
    })) || [];

    const bookingTimeOptions = useMemo(() => generateTimeOptions(15), []);

    // Load Data
    const { data: allBookings, isLoading: isLoadingBooking } = useBookings(undefined, undefined, undefined);

    useEffect(() => {
        if (isEditMode && allBookings) {
            const bookingToEdit = allBookings.find(b => b.id === bookingId);
            if (bookingToEdit) {
                if (user?.employee?.id !== bookingToEdit.organizerEmployeeId) {
                    toast.error("Bạn không có quyền chỉnh sửa lịch này");
                    router.push(returnUrl);
                    return;
                }
                setTitle(bookingToEdit.title);
                setContent(bookingToEdit.description || "");
                setNote(bookingToEdit.note || "");
                setRoomId(bookingToEdit.roomId);
                setDate(format(new Date(bookingToEdit.startDatetime), "yyyy-MM-dd"));
                setStartTime(format(new Date(bookingToEdit.startDatetime), "HH:mm"));
                setEndTime(format(new Date(bookingToEdit.endDatetime), "HH:mm"));
                setIsPrivate(bookingToEdit.isPrivate || false);
                setSelectedAttendees(bookingToEdit.attendees?.map((a: any) => a.employeeId) || []);
            }
        }
    }, [isEditMode, allBookings, bookingId, user, router, returnUrl]);

    // Apply init params from Calendar slot
    useEffect(() => {
        if (!isEditMode) {
            const queryDate = searchParams.get("date");
            const queryStart = searchParams.get("startTime");
            const queryEnd = searchParams.get("endTime");
            const queryRoom = searchParams.get("roomId");

            if (queryDate) setDate(queryDate);
            else {
                const now = new Date();
                setDate(format(now, "yyyy-MM-dd"));
                if (!queryStart) {
                    const minutes = now.getMinutes();
                    const remainder = minutes % 15;
                    now.setMinutes(remainder === 0 ? minutes : minutes + (15 - remainder));
                    now.setSeconds(0);
                    setStartTime(format(now, "HH:mm"));
                    setEndTime(format(addMinutes(now, 30), "HH:mm"));
                }
            }
            if (queryStart) setStartTime(queryStart);
            if (queryEnd) setEndTime(queryEnd);
            if (queryRoom) setRoomId(queryRoom);
            else if (rooms && rooms.length > 0) {
                setRoomId(rooms[0].id);
            }
        }
    }, [isEditMode, searchParams, rooms]);

    // Check Availability
    const availabilityFrom = useMemo(() => {
        if (!date) return undefined;
        try { return startOfDay(parse(date, "yyyy-MM-dd", new Date())).toISOString(); } catch { return undefined; }
    }, [date]);
    const availabilityTo = useMemo(() => {
        if (!date) return undefined;
        try { return endOfDay(parse(date, "yyyy-MM-dd", new Date())).toISOString(); } catch { return undefined; }
    }, [date]);

    const { data: dailyBookings } = useBookings(undefined, availabilityFrom, availabilityTo);

    const getRoomStatus = (checkRoomId: string) => {
        if (!date || !startTime || !endTime || !dailyBookings) return null;
        try {
            const start = parse(`${date} ${startTime}`, "yyyy-MM-dd HH:mm", new Date());
            const end = parse(`${date} ${endTime}`, "yyyy-MM-dd HH:mm", new Date());

            const conflict = dailyBookings.find(b => {
                if (b.roomId !== checkRoomId) return false;
                if (bookingId && b.id === bookingId) return false;
                const bStart = new Date(b.startDatetime);
                const bEnd = new Date(b.endDatetime);
                return (start < bEnd && end > bStart);
            });

            if (conflict) {
                const organizer = conflict.organizer;
                let holderName = organizer ? `${organizer.lastName || ""} ${organizer.firstName || ""}`.trim() : "";
                let extraInfo = "";

                if (employeesData?.data) {
                    const foundEmp = employeesData.data.find((e: any) => e.employeeId === conflict.organizerEmployeeId || e.id === conflict.organizerEmployeeId);
                    if (foundEmp) {
                        if (!holderName) holderName = foundEmp.fullName;
                        const empCode = foundEmp.employeeCode || "";
                        const deptName = foundEmp.department?.name || "";
                        if (empCode && deptName) extraInfo = `${empCode} - ${deptName}`;
                        else if (empCode) extraInfo = empCode;
                        else if (deptName) extraInfo = deptName;
                    }
                }
                if (!holderName) holderName = `NV${conflict.organizerEmployeeId}`;
                return { status: "booked", holder: holderName, code: extraInfo || conflict.organizerEmployeeId || "---" };
            }
            return { status: "available" };
        } catch (e) {
            return null;
        }
    };

    const handleSave = () => {
        if (!title || !roomId || !date || !startTime || !endTime) {
            toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
            return;
        }

        const bookingData = {
            roomId: roomId,
            startTime: new Date(`${date}T${startTime}`).toISOString(),
            endTime: new Date(`${date}T${endTime}`).toISOString(),
            purpose: title,
            description: content,
            note: note,
            attendeeIds: selectedAttendees,
            isPrivate: isPrivate,
            notify: notify
        };

        if (isEditMode && bookingId) {
            updateBooking.mutate({ id: bookingId, data: bookingData }, {
                onSuccess: () => {
                    toast.success("Cập nhật lịch thành công");
                    queryClient.invalidateQueries({ queryKey: ["bookings"] });
                    router.push(returnUrl);
                },
                onError: (error: any) => toast.error(error.response?.data?.message || "Có lỗi xảy ra")
            });
        } else {
            createBooking.mutate(bookingData, {
                onSuccess: () => {
                    toast.success(notify ? "Đã đặt phòng và gửi thông báo!" : "Đặt phòng thành công");
                    queryClient.invalidateQueries({ queryKey: ["bookings"] });
                    router.push(returnUrl);
                },
                onError: (error: any) => toast.error(error.response?.data?.message || "Có lỗi xảy ra")
            });
        }
    };

    const isSubmitting = createBooking.isPending || updateBooking.isPending;

    if (isEditMode && isLoadingBooking) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto w-full pb-10">
            <PageHeader
                title={isEditMode ? "Cập nhật lịch họp" : "Đặt phòng họp"}
                description={isEditMode ? "Cập nhật thông tin lịch họp đã hẹn" : "Tạo lịch họp mới, chọn người tham gia và thiết lập thông báo"}
                backHref={returnUrl}
                icon={
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm text-white">
                        <CalendarDays className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" onClick={() => router.push(returnUrl)} className="h-10 px-4">
                            Hủy bỏ
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSubmitting || !title.trim() || !roomId || !date || !startTime || !endTime}
                            className="h-10 px-6 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditMode ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />)}
                            {isEditMode ? "Cập nhật" : "Xác nhận đặt"}
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-xl border shadow-sm">
                        <CardHeader className="bg-muted/10 pb-4 border-b">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                <Info className="h-4 w-4" />
                                <span>Thông tin chung</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" required className="font-semibold text-foreground">Tiêu đề cuộc họp</Label>
                                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Họp giao ban phòng Phát triển..." autoFocus className="bg-background focus-visible:ring-1 h-10" />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-semibold text-foreground">Khoảng thời gian <span className="text-red-500">*</span></Label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/20 p-4 rounded-lg border">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ngày</Label>
                                        <DatePicker
                                            value={date}
                                            onChange={d => setDate(d ? format(d, "yyyy-MM-dd") : "")}
                                            className="h-9 w-full bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bắt đầu</Label>
                                        <TimePicker
                                            value={startTime}
                                            onChange={setStartTime}
                                            options={bookingTimeOptions}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Kết thúc</Label>
                                        <TimePicker
                                            value={endTime}
                                            onChange={setEndTime}
                                            options={bookingTimeOptions}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-semibold text-foreground">Chọn phòng <span className="text-red-500">*</span></Label>
                                <Select value={roomId} onValueChange={setRoomId}>
                                    <SelectTrigger className="h-10 bg-background">
                                        <SelectValue placeholder="Chọn phòng họp..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {rooms?.map((room: any) => {
                                            const status = getRoomStatus(room.id);
                                            return (
                                                <SelectItem key={room.id} value={room.id} disabled={status?.status === "booked"} className="w-full">
                                                    <div className="flex items-center justify-between w-full gap-4">
                                                        <span className="font-medium whitespace-nowrap">{room.name}</span>
                                                        {status ? (
                                                            status.status === "booked" ? (
                                                                <div className="flex items-center justify-end gap-2 text-right">
                                                                    <span className="text-[10px] uppercase font-bold text-red-600 bg-red-100/50 px-1 p-0.5 rounded whitespace-nowrap flex-shrink-0">Đã đặt</span>
                                                                    <div className="flex items-center gap-1 text-[11px] leading-tight">
                                                                        <span className="font-bold">{status.holder}</span>
                                                                        <span className="text-muted-foreground whitespace-nowrap hidden sm:inline"> — </span>
                                                                        <span className="text-muted-foreground">{status.code}</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-end">
                                                                    <span className="text-[10px] uppercase font-bold text-green-600 bg-green-100/50 px-1.5 rounded whitespace-nowrap">Trống</span>
                                                                </div>
                                                            )
                                                        ) : <div />}
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-xl border shadow-sm">
                        <CardHeader className="bg-muted/10 pb-4 border-b">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                <Search className="h-4 w-4" />
                                <span>Thành phần tham dự & Nội dung</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label className="font-semibold text-foreground">Người tham dự</Label>
                                <MultiSelect
                                    options={employeeOptions}
                                    selected={selectedAttendees}
                                    onChange={setSelectedAttendees}
                                    placeholder="Thêm nhân viên vào cuộc họp..."
                                    className="w-full bg-background"
                                />
                                <p className="text-[11px] text-muted-foreground">Những người được chọn sẽ nhận được email thống báo (nếu bật).</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-semibold text-foreground">Nội dung cuộc họp</Label>
                                <Textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="Mô tả chi tiết nội dung cuộc họp..."
                                    className="min-h-[120px] bg-background focus-visible:ring-1"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-semibold text-foreground">Ghi chú thêm</Label>
                                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Yêu cầu chuẩn bị thiết bị, nước uống..." className="bg-background focus-visible:ring-1 h-10" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="rounded-xl border shadow-sm">
                        <CardHeader className="bg-muted/10 pb-4 border-b">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                <Lock className="h-4 w-4" />
                                <span>Cài đặt chung</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-3">
                                <Label className="font-semibold text-foreground">Hiển thị lịch</Label>
                                <div className="space-y-3">
                                    <div
                                        className={cn(
                                            "flex items-center space-x-3 cursor-pointer border rounded-lg p-3 transition-colors",
                                            !isPrivate ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900" : "border-border hover:bg-muted/50"
                                        )}
                                        onClick={() => setIsPrivate(false)}
                                    >
                                        <div className={cn("p-2 rounded-full", !isPrivate ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400" : "bg-muted text-muted-foreground")}>
                                            <Globe className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className={cn("text-sm font-medium", !isPrivate ? "text-blue-700 dark:text-blue-300" : "text-foreground")}>Công khai</p>
                                            <p className="text-xs text-muted-foreground">Tất cả nhân viên nhìn thấy tiêu đề</p>
                                        </div>
                                    </div>
                                    <div
                                        className={cn(
                                            "flex items-center space-x-3 cursor-pointer border rounded-lg p-3 transition-colors",
                                            isPrivate ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900" : "border-border hover:bg-muted/50"
                                        )}
                                        onClick={() => setIsPrivate(true)}
                                    >
                                        <div className={cn("p-2 rounded-full", isPrivate ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400" : "bg-muted text-muted-foreground")}>
                                            <Lock className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className={cn("text-sm font-medium", isPrivate ? "text-blue-700 dark:text-blue-300" : "text-foreground")}>Riêng tư</p>
                                            <p className="text-xs text-muted-foreground">Chỉ người tham dự thấy chi tiết</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t">
                                <Label className="font-semibold text-foreground">Thông báo</Label>
                                <div className="flex items-start space-x-3">
                                    <Checkbox id="notify" checked={notify} onCheckedChange={(c) => setNotify(c as boolean)} className="mt-0.5" />
                                    <div className="space-y-1 leading-none">
                                        <Label htmlFor="notify" className="text-sm font-medium cursor-pointer">Gửi email thông báo</Label>
                                        <p className="text-[11px] text-muted-foreground">Tự động gửi email lịch mời họp đến những người tham dự.</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export function BookingForm(props: BookingFormProps) {
    return (
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <BookingFormInternal {...props} />
        </Suspense>
    );
}
