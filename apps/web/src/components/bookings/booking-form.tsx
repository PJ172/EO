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
import { Calendar, Globe, Lock, Save, Plus, Clock, Search, Info, ChevronsUpDown, Check, Loader2, CalendarDays, Repeat, Users, Monitor, Sparkles, Paperclip, X, FileText, ImageIcon } from "lucide-react";
import { format, addMinutes, parse, startOfDay, endOfDay } from "date-fns";



function TimePicker({ value, onChange, label }: { value: string, onChange: (val: string) => void, label?: string }) {
    return (
        <div className="relative">
            <div className="relative flex items-center">
                <Clock className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                    type="time"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    step={900}
                    className={cn(
                        "flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 py-1 text-sm font-mono shadow-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        "placeholder:text-muted-foreground",
                        "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    )}
                />
            </div>
        </div>
    );
}

interface BookingFormProps {
    bookingId?: string | null;
    returnUrl?: string;
}

function BookingFormInternal({ bookingId, returnUrl = "/ga/meetings" }: BookingFormProps) {
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
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringRule, setRecurringRule] = useState("WEEKLY");
    const [recurringEndDate, setRecurringEndDate] = useState("");
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);

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

        const bookingData: any = {
            roomId: roomId,
            startTime: new Date(`${date}T${startTime}`).toISOString(),
            endTime: new Date(`${date}T${endTime}`).toISOString(),
            purpose: title,
            description: content,
            note: note,
            attendeeIds: selectedAttendees,
            isPrivate: isPrivate,
        };

        if (!isEditMode && isRecurring && recurringEndDate) {
            bookingData.isRecurring = true;
            bookingData.recurringRule = recurringRule;
            bookingData.recurringEndDate = new Date(`${recurringEndDate}T23:59:59`).toISOString();
        }

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
                onSuccess: (result: any) => {
                    if (result?.created !== undefined) {
                        const msg = `Đã tạo ${result.created} buổi họp lặp lại` +
                            (result.skipped > 0 ? ` (bỏ qua ${result.skipped} buổi do xung đột)` : '');
                        toast.success(msg);
                    } else {
                        toast.success(notify ? "Đã đặt phòng và gửi thông báo!" : "Đặt phòng thành công");
                    }
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
        <div className="space-y-2 w-full pb-3 animate-in fade-in slide-in-from-bottom-4 duration-500 px-3">
            <PageHeader
                title={isEditMode ? "Cập nhật lịch họp" : "Đặt phòng họp"}
                backHref={returnUrl}
                icon={
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-sm text-white">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                <div className="lg:col-span-2 space-y-0">
                    <Card className="rounded-xl border shadow-sm">
                        <CardHeader className="bg-slate-50/80 dark:bg-slate-900/30 pb-2 pt-2 px-4 border-b">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <div className="h-4 w-1 rounded-full bg-blue-500" />
                                <Info className="h-3.5 w-3.5" />
                                <span>Thông tin chung</span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-1 px-2.5 pb-2 space-y-2">
                            {/* Title + Room + Lặp lại — inline row */}
                            <div className="grid grid-cols-8 gap-2 items-end">
                                <div className="col-span-4 space-y-2">
                                    <Label htmlFor="title" className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Tiêu đề cuộc họp <span className="text-red-500">*</span></Label>
                                    <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Họp giao ban phòng Phát triển..." autoFocus className="bg-background focus-visible:ring-1 h-9" />
                                </div>
                                <div className="col-span-3 space-y-2">
                                    <Label className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Phòng họp <span className="text-red-500">*</span></Label>
                                    <Select value={roomId} onValueChange={setRoomId}>
                                        <SelectTrigger className="h-9 bg-background">
                                            <SelectValue placeholder="Chọn phòng..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rooms?.map((room: any) => {
                                                const status = getRoomStatus(room.id);
                                                return (
                                                    <SelectItem key={room.id} value={room.id} disabled={status?.status === "booked"} className="w-full">
                                                        <div className="flex items-center justify-between w-full gap-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: room.color || '#3b82f6' }} />
                                                                <span className="font-medium whitespace-nowrap">{room.name}</span>
                                                            </div>
                                                            {status ? (
                                                                status.status === "booked" ? (
                                                                    <span className="text-[10px] uppercase font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded whitespace-nowrap">Đã đặt</span>
                                                                ) : (
                                                                    <span className="text-[10px] uppercase font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded whitespace-nowrap">Trống</span>
                                                                )
                                                            ) : null}
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Lặp lại toggle — far right */}
                                {!isEditMode && (
                                    <div className="col-span-1 flex flex-col items-center justify-end gap-1 pb-0.5">
                                        <Label className="font-semibold text-foreground text-[11px] uppercase tracking-wider whitespace-nowrap">Lặp lại</Label>
                                        <button
                                            type="button"
                                            onClick={() => setIsRecurring(!isRecurring)}
                                            className={cn(
                                                "h-9 w-full rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                                                isRecurring
                                                    ? "bg-teal-50 border-teal-300 dark:bg-teal-950/30 dark:border-teal-700"
                                                    : "bg-muted/20 border-border hover:bg-muted/40"
                                            )}
                                        >
                                            <Repeat className={cn("h-3.5 w-3.5 shrink-0", isRecurring ? "text-teal-600" : "text-muted-foreground")} />
                                            <div className={cn(
                                                "h-4 w-8 rounded-full transition-colors relative shrink-0",
                                                isRecurring ? "bg-teal-500" : "bg-muted-foreground/30"
                                            )}>
                                                <div className={cn(
                                                    "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform",
                                                    isRecurring ? "translate-x-4" : "translate-x-0.5"
                                                )} />
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="font-semibold text-foreground text-xs">Khoảng thời gian <span className="text-red-500">*</span></Label>
                                <div className="grid grid-cols-3 gap-2 bg-muted/30 p-2.5 rounded-lg border">
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
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Kết thúc</Label>
                                        <TimePicker
                                            value={endTime}
                                            onChange={setEndTime}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Recurring panel — expands below time row when enabled */}
                            {!isEditMode && isRecurring && (
                                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border bg-teal-50/50 dark:bg-teal-950/20 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Tần suất</Label>
                                        <Select value={recurringRule} onValueChange={setRecurringRule}>
                                            <SelectTrigger className="h-8 bg-background text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DAILY">Hàng ngày</SelectItem>
                                                <SelectItem value="WEEKLY">Hàng tuần</SelectItem>
                                                <SelectItem value="MONTHLY">Hàng tháng</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Kết thúc vào</Label>
                                        <DatePicker
                                            value={recurringEndDate}
                                            onChange={d => setRecurringEndDate(d ? format(d, "yyyy-MM-dd") : "")}
                                            className="h-8 w-full bg-background"
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-xl border shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/80 dark:bg-slate-900/30 pb-2 pt-3 px-4 border-b">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <div className="h-4 w-1 rounded-full bg-emerald-500" />
                                <Search className="h-3.5 w-3.5" />
                                <span>Thành phần tham dự & Nội dung</span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2 px-3 pb-3 space-y-2">
                            <div className="space-y-2">
                                <Label className="font-semibold text-foreground text-xs">Người tham dự</Label>
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
                                <Label className="font-semibold text-foreground text-xs">Nội dung cuộc họp</Label>
                                <Textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="Mô tả chi tiết nội dung cuộc họp..."
                                    className="min-h-[60px] bg-background focus-visible:ring-1 resize-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="font-semibold text-foreground text-xs">Ghi chú thêm</Label>
                                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Yêu cầu chuẩn bị thiết bị, nước uống..." className="bg-background focus-visible:ring-1 h-9" />
                            </div>

                            {/* ─── File Attachment ─── */}
                            <div className="space-y-1.5">
                                <Label className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                                    <Paperclip className="h-3.5 w-3.5" /> File đính kèm
                                </Label>
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragOver(false);
                                        const files = Array.from(e.dataTransfer.files);
                                        setAttachments(prev => [...prev, ...files].slice(0, 10));
                                    }}
                                    onClick={() => document.getElementById('file-upload-input')?.click()}
                                    className={cn(
                                        "border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer transition-all duration-200 select-none",
                                        isDragOver
                                            ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30 scale-[1.01]"
                                            : "border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    <input
                                        id="file-upload-input"
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                                        className="hidden"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files || []);
                                            setAttachments(prev => [...prev, ...files].slice(0, 10));
                                            e.target.value = '';
                                        }}
                                    />
                                    <Paperclip className="h-5 w-5 mx-auto mb-1.5 text-slate-400" />
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        <span className="font-semibold text-blue-600">Nhấn để chọn</span> hoặc kéo thả file vào đây
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">PDF, DOC, XLSX, PPT, ảnh — Tối đa 10 file</p>
                                </div>
                                {attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {attachments.map((file, i) => (
                                            <div key={i} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1.5 text-[11px] font-medium max-w-[200px] group">
                                                {file.type.startsWith('image/') ? <ImageIcon className="h-3 w-3 shrink-0 text-blue-500" /> : <FileText className="h-3 w-3 shrink-0 text-indigo-500" />}
                                                <span className="truncate">{file.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setAttachments(prev => prev.filter((_, idx) => idx !== i)); }}
                                                    className="ml-0.5 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-3 lg:sticky lg:top-4">
                    {/* Room Quick Info — shows when room selected */}
                    {roomId && rooms && rooms.length > 0 && (() => {
                        const selectedRoom = (rooms as any[]).find((r: any) => r.id === roomId);
                        if (!selectedRoom) return null;
                        return (
                            <Card className="rounded-xl border shadow-sm overflow-hidden animate-in fade-in duration-200">
                                {selectedRoom.image && (
                                    <div className="h-28 w-full overflow-hidden">
                                        <img src={selectedRoom.image} alt={selectedRoom.name} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <CardContent className="p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: selectedRoom.color || '#3b82f6' }} />
                                        <h4 className="font-bold text-sm">{selectedRoom.name}</h4>
                                    </div>
                                    {selectedRoom.description && (
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">{selectedRoom.description}</p>
                                    )}
                                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="h-3 w-3" />
                                            <span>{selectedRoom.capacity} người</span>
                                        </div>
                                        {selectedRoom.equipment?.length > 0 && (
                                            <div className="flex items-center gap-1.5">
                                                <Monitor className="h-3 w-3" />
                                                <span>{selectedRoom.equipment.length} thiết bị</span>
                                            </div>
                                        )}
                                    </div>
                                    {selectedRoom.equipment?.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {selectedRoom.equipment.map((eq: string, i: number) => (
                                                <span key={i} className="bg-slate-100 dark:bg-slate-800 text-[10px] px-1.5 py-0.5 rounded">{eq}</span>
                                            ))}
                                        </div>
                                    )}
                                    {selectedRoom.features?.length > 0 && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                                <Sparkles className="h-2.5 w-2.5" />
                                                <span>Đặc điểm:</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {selectedRoom.features.map((feat: string, i: number) => (
                                                    <span key={i} className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-800">{feat}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })()}

                    {/* Settings Card */}
                    <Card className="rounded-xl border shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/80 dark:bg-slate-900/30 pb-2 pt-3 px-4 border-b">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <div className="h-4 w-1 rounded-full bg-amber-500" />
                                <Lock className="h-3.5 w-3.5" />
                                <span>Cài đặt chung</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 space-y-3">
                            <div className="space-y-2.5">
                                <Label className="text-xs font-semibold text-foreground">Hiển thị lịch</Label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <div
                                        className={cn(
                                            "flex items-center gap-2 cursor-pointer border rounded-lg p-2 transition-colors",
                                            !isPrivate ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900" : "border-border hover:bg-muted/50"
                                        )}
                                        onClick={() => setIsPrivate(false)}
                                    >
                                        <div className={cn("p-1.5 rounded-full", !isPrivate ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600" : "bg-muted text-muted-foreground")}>
                                            <Globe className="h-3.5 w-3.5" />
                                        </div>
                                        <div>
                                            <p className={cn("text-xs font-medium", !isPrivate ? "text-blue-700 dark:text-blue-300" : "text-foreground")}>Công khai</p>
                                            <p className="text-[10px] text-muted-foreground">Tất cả nhân viên nhìn thấy tiêu đề</p>
                                        </div>
                                    </div>
                                    <div
                                        className={cn(
                                            "flex items-center gap-2 cursor-pointer border rounded-lg p-2 transition-colors",
                                            isPrivate ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900" : "border-border hover:bg-muted/50"
                                        )}
                                        onClick={() => setIsPrivate(true)}
                                    >
                                        <div className={cn("p-1.5 rounded-full", isPrivate ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600" : "bg-muted text-muted-foreground")}>
                                            <Lock className="h-3.5 w-3.5" />
                                        </div>
                                        <div>
                                            <p className={cn("text-xs font-medium", isPrivate ? "text-blue-700 dark:text-blue-300" : "text-foreground")}>Riêng tư</p>
                                            <p className="text-[10px] text-muted-foreground">Chỉ người tham dự thấy chi tiết</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t">
                                <Label className="text-xs font-semibold text-foreground">Thông báo</Label>
                                <div className="flex items-start gap-2.5">
                                    <Checkbox id="notify" checked={notify} onCheckedChange={(c) => setNotify(c as boolean)} className="mt-0.5" />
                                    <div className="space-y-0.5 leading-none">
                                        <Label htmlFor="notify" className="text-xs font-medium cursor-pointer">Gửi email thông báo</Label>
                                        <p className="text-[10px] text-muted-foreground">Tự động gửi email lịch mời họp.</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Meeting Summary Preview */}
                    {(title || date || startTime) && (
                        <Card className="rounded-xl border shadow-sm overflow-hidden animate-in fade-in duration-200">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    Tóm tắt cuộc họp
                                </div>
                                <div className="space-y-2 text-sm">
                                    {title && <p className="font-semibold text-foreground truncate">{title}</p>}
                                    {date && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3 shrink-0" />
                                            <span>{date}{startTime && ` • ${startTime}`}{endTime && ` - ${endTime}`}</span>
                                        </div>
                                    )}
                                    {selectedAttendees.length > 0 && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Users className="h-3 w-3 shrink-0" />
                                            <span>{selectedAttendees.length} người tham dự</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        {isPrivate ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium"><Lock className="h-2.5 w-2.5" />Riêng tư</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium"><Globe className="h-2.5 w-2.5" />Công khai</span>
                                        )}
                                        {isRecurring && (
                                            <span className="inline-flex items-center gap-1 text-[10px] bg-teal-50 dark:bg-teal-950/30 text-teal-700 px-1.5 py-0.5 rounded font-medium"><Repeat className="h-2.5 w-2.5" />Lặp lại</span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
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
