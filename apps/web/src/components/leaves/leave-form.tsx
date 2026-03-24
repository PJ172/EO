"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import { useCreateLeave, useLeaveTypes, useSubmitLeave, CreateLeaveDto } from "@/services/leave.service";
import { leaveRequestSchema, LeaveRequestFormData } from "@/lib/validations/schemas";
import { Loader2 } from "lucide-react";
import { addDays, format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";

export function LeaveForm() {
    const router = useRouter();
    const { data: leaveTypes, isLoading: isLoadingTypes } = useLeaveTypes();
    const createLeave = useCreateLeave();
    const submitLeave = useSubmitLeave();

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<LeaveRequestFormData>({
        resolver: zodResolver(leaveRequestSchema),
        defaultValues: {
            // Default to tomorrow
            startDatetime: format(addDays(new Date(), 1), "yyyy-MM-dd'T'08:30"),
            endDatetime: format(addDays(new Date(), 1), "yyyy-MM-dd'T'17:30"),
        }
    });

    // Watch start date to auto update end date if needed (optional UX)
    // const startDatetime = watch("startDatetime");

    const onSubmit = async (data: LeaveRequestFormData) => {
        try {
            // 1. Create Draft
            const leave = await createLeave.mutateAsync(data);

            // 2. Auto Submit (for now simplified UX, can split into 2 steps later)
            await submitLeave.mutateAsync(leave.id);

            toast.success("Gửi đơn xin nghỉ phép thành công!");
            router.push("/leaves");
        } catch (error: any) {
            const message = error?.response?.data?.message || "Đã có lỗi xảy ra";
            const description = Array.isArray(message) ? message.join(", ") : message;
            toast.error("Lỗi", { description });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tạo đơn xin nghỉ phép</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="leaveTypeId" required>Loại nghỉ phép</Label>
                            <Select onValueChange={(val) => setValue("leaveTypeId", val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn loại nghỉ" />
                                </SelectTrigger>
                                <SelectContent>
                                    {leaveTypes?.map((type) => (
                                        <SelectItem key={type.id} value={type.id}>
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.leaveTypeId && (
                                <p className="text-sm text-destructive">{errors.leaveTypeId.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="startDatetime" required>Từ ngày</Label>
                            <DatePicker
                                value={watch("startDatetime")}
                                onChange={(date) => setValue("startDatetime", date ? format(date, "yyyy-MM-dd'T'08:30") : "")}
                            />
                            {errors.startDatetime && (
                                <p className="text-sm text-destructive">{errors.startDatetime.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="endDatetime" required>Đến ngày</Label>
                            <DatePicker
                                value={watch("endDatetime")}
                                onChange={(date) => setValue("endDatetime", date ? format(date, "yyyy-MM-dd'T'17:30") : "")}
                            />
                            {errors.endDatetime && (
                                <p className="text-sm text-destructive">{errors.endDatetime.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Lý do nghỉ</Label>
                        <Textarea
                            id="reason"
                            placeholder="Nhập lý do chi tiết..."
                            {...register("reason")}
                        />
                        {errors.reason && (
                            <p className="text-sm text-destructive">{errors.reason.message}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" disabled={isSubmitting || createLeave.isPending}>
                            {(isSubmitting || createLeave.isPending) && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Gửi đơn
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
