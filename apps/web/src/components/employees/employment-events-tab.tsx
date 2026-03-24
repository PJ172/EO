"use client";

import * as XLSX from "xlsx";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { 
    Loader2, Plus, Trash2, History, Pencil, Briefcase, 
    ShieldCheck, LogOut, Stethoscope, RotateCcw, 
    PauseCircle, Calendar, FileText, Info 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetDescription,
} from "@/components/ui/sheet";
import { 
    useEmploymentEvents, 
    useCreateEmploymentEvent, 
    useDeleteEmploymentEvent, 
    useUpdateEmploymentEvent, 
    EmploymentEvent 
} from "@/services/employee.service";
import { toast } from "@/components/ui/toaster";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const eventSchema = z.object({
    eventType: z.enum(["PROBATION", "OFFICIAL", "RESIGNED", "MATERNITY_LEAVE", "RETURN_TO_WORK", "SUSPENDED"]),
    effectiveDate: z.date({
        message: "Vui lòng chọn ngày hiệu lực",
    }),
    endDate: z.date().optional(),
    decisionNumber: z.string().optional(),
    reason: z.string().optional(),
    note: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

const EVENT_TYPE_CONFIG: Record<string, { label: string, icon: any, color: string, bgColor: string, borderColor: string }> = {
    PROBATION: { 
        label: "Thử việc", 
        icon: Briefcase, 
        color: "text-amber-600", 
        bgColor: "bg-amber-50 dark:bg-amber-900/20", 
        borderColor: "border-amber-200 dark:border-amber-800/50" 
    },
    OFFICIAL: { 
        label: "Chính thức", 
        icon: ShieldCheck, 
        color: "text-emerald-600", 
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20", 
        borderColor: "border-emerald-200 dark:border-emerald-800/50" 
    },
    RESIGNED: { 
        label: "Nghỉ việc", 
        icon: LogOut, 
        color: "text-rose-600", 
        bgColor: "bg-rose-50 dark:bg-rose-900/20", 
        borderColor: "border-rose-200 dark:border-rose-800/50" 
    },
    MATERNITY_LEAVE: { 
        label: "Thai sản", 
        icon: Stethoscope, 
        color: "text-purple-600", 
        bgColor: "bg-purple-50 dark:bg-purple-900/20", 
        borderColor: "border-purple-200 dark:border-purple-800/50" 
    },
    RETURN_TO_WORK: { 
        label: "Đi làm lại", 
        icon: RotateCcw, 
        color: "text-sky-600", 
        bgColor: "bg-sky-50 dark:bg-sky-900/20", 
        borderColor: "border-sky-200 dark:border-sky-800/50" 
    },
    SUSPENDED: { 
        label: "Tạm nghỉ", 
        icon: PauseCircle, 
        color: "text-slate-600", 
        bgColor: "bg-slate-50 dark:bg-slate-800/20", 
        borderColor: "border-slate-200 dark:border-slate-700/50" 
    },
};

interface EmploymentEventsTabProps {
    employeeId: string;
    readonly?: boolean;
}

export function EmploymentEventsTab({ employeeId, readonly = false }: EmploymentEventsTabProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<EmploymentEvent | null>(null);
    const { data: events, isLoading } = useEmploymentEvents(employeeId);
    const createEventMutation = useCreateEmploymentEvent();
    const updateEventMutation = useUpdateEmploymentEvent();
    const deleteEventMutation = useDeleteEmploymentEvent();

    const form = useForm<EventFormData>({
        resolver: zodResolver(eventSchema),
        defaultValues: {
            effectiveDate: new Date(),
        },
    });

    const eventTypeStr = form.watch("eventType");

    const onSubmit = async (data: EventFormData) => {
        try {
            if (editingEvent) {
                await updateEventMutation.mutateAsync({
                    employeeId,
                    eventId: editingEvent.id,
                    eventType: data.eventType,
                    effectiveDate: format(data.effectiveDate, "yyyy-MM-dd"),
                    endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : undefined,
                    decisionNumber: data.decisionNumber,
                    reason: data.reason,
                    note: data.note,
                });
            } else {
                await createEventMutation.mutateAsync({
                    employeeId,
                    eventType: data.eventType,
                    effectiveDate: format(data.effectiveDate, "yyyy-MM-dd"),
                    endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : undefined,
                    decisionNumber: data.decisionNumber,
                    reason: data.reason,
                    note: data.note,
                });
            }
            setIsOpen(false);
            setEditingEvent(null);
            form.reset({ effectiveDate: new Date() });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (eventId: string) => {
        if (confirm("Bạn có chắc chắn muốn xóa biến động này không? Thông tin trạng thái nhân viên liên quan có thể cần được kiểm tra lại.")) {
            try {
                await deleteEventMutation.mutateAsync({ employeeId, eventId });
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleExportExcel = () => {
        if (!events || events.length === 0) {
            toast.error("Không có dữ liệu để xuất");
            return;
        }

        const worksheetData = events.map((event, index) => {
            const config = EVENT_TYPE_CONFIG[event.eventType];
            return {
                "STT": index + 1,
                "Loại biến động": config?.label || event.eventType,
                "Ngày hiệu lực": format(new Date(event.effectiveDate), "dd/MM/yyyy"),
                "Số quyết định": event.decisionNumber || "",
                "Lý do / Ghi chú": event.reason || event.note || "",
                "Người thực hiện": "Hệ thống",
                "Ngày tạo": format(new Date(event.createdAt), "dd/MM/yyyy HH:mm")
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        
        // Auto sizing columns
        const maxWidths = [5, 25, 15, 20, 35, 15, 20];
        worksheet["!cols"] = maxWidths.map(w => ({ wch: w }));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Lịch sử biến động");
        
        XLSX.writeFile(workbook, `Bien_Dong_Nhan_Su_${employeeId}.xlsx`);
        toast.success("Đã xuất tệp Excel thành công");
    };

    return (
        <div className="space-y-6 pt-4 pb-8">
            <div className="flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                <div className="space-y-1">
                    <h3 className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        Lịch sử biến động nhân sự
                    </h3>
                    <p className="text-xs text-muted-foreground ml-8">Theo dõi quá trình công tác và thay đổi trạng thái hồ sơ</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        type="button" 
                        onClick={handleExportExcel} 
                        variant="outline" 
                        className="h-10 px-4 rounded-xl flex items-center gap-1.5 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/80"
                    >
                        <FileText className="w-4 h-4" /> Xuất Excel
                    </Button>
                    {!readonly && <Sheet open={isOpen} onOpenChange={(open) => {
                    setIsOpen(open);
                    if (!open) {
                        setEditingEvent(null);
                        form.reset({ effectiveDate: new Date() });
                    }
                }}>
                    <SheetTrigger className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-hidden disabled:pointer-events-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/50 dark:shadow-none shadow-lg h-10 px-4">
                        <Plus className="w-4 h-4 mr-1.5" /> Thêm biến động
                    </SheetTrigger>
                    <SheetContent side="right" className="sm:max-w-[480px] w-full p-0 border-none shadow-2xl flex flex-col h-full bg-white dark:bg-slate-950">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
                            <SheetHeader className="space-y-1">
                                <SheetTitle className="text-white text-xl flex items-center gap-2">
                                    {editingEvent ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                    {editingEvent ? "Cập nhật biến động" : "Thêm biến động nhân sự"}
                                </SheetTitle>
                                <SheetDescription className="text-emerald-100 text-xs opacity-90">
                                    Hệ thống sẽ tự động cập nhật trạng thái nhân viên sau khi lưu.
                                </SheetDescription>
                            </SheetHeader>
                        </div>
                        <form onSubmit={(e) => { e.stopPropagation(); form.handleSubmit(onSubmit)(e); }} className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950">
                            <div className="flex-1 p-6 space-y-5 overflow-y-auto">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Loại biến động <span className="text-rose-500">*</span></Label>
                                    <Select
                                        onValueChange={(val) => form.setValue("eventType", val as any)}
                                        value={form.watch("eventType")}>
                                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                            <SelectValue placeholder="Chọn loại biến động" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {Object.entries(EVENT_TYPE_CONFIG).map(([value, cfg]) => {
                                                const Icon = cfg.icon;
                                                return (
                                                    <SelectItem key={value} value={value} className="py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <Icon className={cn("w-4 h-4", cfg.color)} />
                                                            <span>{cfg.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                    {form.formState.errors.eventType && (
                                        <p className="text-[11px] text-rose-500 font-medium">{form.formState.errors.eventType.message}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Ngày hiệu lực <span className="text-rose-500">*</span></Label>
                                        <DatePicker
                                            value={form.watch("effectiveDate")}
                                            onChange={(date) => form.setValue("effectiveDate", date as Date)}
                                            className="h-11 rounded-xl border-slate-200 dark:border-slate-800"
                                        />
                                        {form.formState.errors.effectiveDate && (
                                            <p className="text-[11px] text-rose-500 font-medium">{form.formState.errors.effectiveDate.message}</p>
                                        )}
                                    </div>

                                    {eventTypeStr === "MATERNITY_LEAVE" ? (
                                        <div className="space-y-2">
                                            <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Ngày dự kiến đi làm lại</Label>
                                            <DatePicker
                                                value={form.watch("endDate")}
                                                onChange={(date) => form.setValue("endDate", date as Date)}
                                                className="h-11 rounded-xl border-slate-200 dark:border-slate-800"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Số quyết định</Label>
                                            <div className="relative">
                                                <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                                <Input 
                                                    {...form.register("decisionNumber")} 
                                                    placeholder="VD: QĐ-2024/001" 
                                                    className="pl-10 h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 uppercase font-medium placeholder:normal-case placeholder:font-normal" 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                                        {eventTypeStr === "RESIGNED" ? "Lý do nghỉ việc" : "Lý do / Ghi chú"}
                                    </Label>
                                    <Textarea 
                                        {...form.register("reason")} 
                                        placeholder="Nhập lý do chi tiết..." 
                                        className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 min-h-[80px]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Ghi chú bổ sung</Label>
                                    <Textarea 
                                        {...form.register("note")} 
                                        placeholder="Các lưu ý khác..." 
                                        className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 min-h-[60px]"
                                    />
                                </div>
                            </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl h-11">Đóng</Button>
                                <Button type="submit" disabled={createEventMutation.isPending || updateEventMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 h-11 px-8 rounded-xl min-w-[120px]">
                                    {(createEventMutation.isPending || updateEventMutation.isPending) ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        "Lưu thay đổi"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </SheetContent>
                </Sheet>}
                </div>
            </div>

            {/* --- NEW PREMIUM TIMELINE VIEW --- */}
            <div className="relative px-2 pt-2">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-sm text-slate-500 bg-slate-50/50 dark:bg-slate-900/10 rounded-3xl border border-dashed">
                        <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-500 opacity-50" />
                        <p className="font-medium">Đang tải lịch sử biến động...</p>
                    </div>
                ) : !events || events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50/30 dark:bg-slate-900/5 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <History className="w-8 h-8 text-slate-300" />
                        </div>
                        <h4 className="text-slate-400 font-medium">Chưa có dữ liệu biến động</h4>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Thông tin thay đổi trạng thái nhân viên sẽ hiển thị tại đây.</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* The vertical line */}
                        <div className="absolute left-[13px] top-[14px] bottom-0 w-[1.5px] bg-gradient-to-b from-blue-200 via-slate-200 to-transparent dark:from-blue-900/50 dark:via-slate-800" />

                        <div className="space-y-8">
                            {events.map((event, index) => {
                                const isNewest = index === 0;
                                const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.SUSPENDED;
                                const Icon = config.icon;

                                return (
                                    <div key={event.id} className="relative group animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                                        {/* Icon Circle */}
                                        <div className={cn(
                                            "absolute left-0 top-[10px] z-10 w-7 h-7 rounded-full bg-white dark:bg-slate-900 border-2 shadow-sm flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                                            config.borderColor
                                        )}>
                                            <Icon className={cn("w-3.5 h-3.5", config.color)} />
                                            {isNewest && (
                                                <div className={cn("absolute inset-[-4px] rounded-full animate-pulse ring-2 ring-primary/20", config.bgColor)} />
                                            )}
                                        </div>

                                        {/* Glassmorphism Card */}
                                        <div className={cn(
                                            "ml-10 relative backdrop-blur-md border rounded-2xl p-4 transition-all duration-300 hover:shadow-lg dark:shadow-none",
                                            isNewest 
                                                ? "bg-white/80 dark:bg-slate-900/60 border-blue-200/60 dark:border-blue-800/40 shadow-blue-100/20" 
                                                : "bg-white/40 dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-800/50 grayscale-[0.3] hover:grayscale-0 shadow-sm"
                                        )}>
                                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                                <div className="space-y-3 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge className={cn("rounded-lg px-2 py-0.5 text-[10px] font-bold border-none", config.bgColor, config.color)}>
                                                            {config.label.toUpperCase()}
                                                        </Badge>
                                                        
                                                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            <span className="text-xs font-semibold">
                                                                {format(new Date(event.effectiveDate), "dd/MM/yyyy")}
                                                            </span>
                                                        </div>

                                                        {isNewest && (
                                                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-blue-500/10 text-blue-600 border-blue-200/50 animate-pulse">
                                                                Trạng thái hiện tại
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                                                        {event.decisionNumber && (
                                                            <div className="flex items-center gap-2 p-1.5 bg-slate-50/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                                <span className="text-[11px] text-slate-500">Số QĐ:</span>
                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tighter">{event.decisionNumber}</span>
                                                            </div>
                                                        )}
                                                        {event.endDate && (
                                                            <div className="flex items-center gap-2 p-1.5 bg-slate-50/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                                <span className="text-[11px] text-slate-500">Kết thúc dự kiến:</span>
                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{format(new Date(event.endDate), "dd/MM/yyyy")}</span>
                                                            </div>
                                                        )}
                                                        {event.reason && (
                                                            <div className="md:col-span-2 flex items-start gap-2 pt-1">
                                                                <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                                                <div className="space-y-0.5">
                                                                    <span className="text-[10px] text-slate-400 font-medium">Lý do:</span>
                                                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic">{event.reason}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {event.note && (
                                                        <div className="mt-2 text-[11px] p-2.5 bg-blue-50/20 dark:bg-blue-900/10 rounded-xl border border-blue-100/30 dark:border-blue-800/10 text-slate-500 leading-relaxed">
                                                            <span className="font-bold text-blue-600/70 dark:text-blue-400/70 mr-1.5 text-[9px] uppercase tracking-widest">Ghi chú:</span> 
                                                            {event.note}
                                                        </div>
                                                    )}
                                                </div>

                                                {!readonly && (
                                                    <div className="flex sm:flex-col items-center gap-1.5 self-end sm:self-start">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setEditingEvent(event);
                                                                form.reset({
                                                                    eventType: event.eventType as any,
                                                                    effectiveDate: new Date(event.effectiveDate),
                                                                    endDate: event.endDate ? new Date(event.endDate) : undefined,
                                                                    decisionNumber: event.decisionNumber || "",
                                                                    reason: event.reason || "",
                                                                    note: event.note || "",
                                                                });
                                                                setIsOpen(true);
                                                            }}
                                                            className="h-8 w-8 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-100 shadow-none"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(event.id)}
                                                            className="h-8 w-8 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-transparent hover:border-rose-100 shadow-none"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
