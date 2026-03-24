"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { carBookingApi } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { Calendar, Loader2, Save } from "lucide-react";
import { format } from "date-fns";

export function CarBookingForm() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [newBooking, setNewBooking] = useState({
        carId: "",
        destination: "",
        purpose: "",
        startTime: "",
        endTime: ""
    });

    const { data: cars } = useQuery({
        queryKey: ["cars"],
        queryFn: carBookingApi.getCars,
    });

    const createBookingMutation = useMutation({
        mutationFn: carBookingApi.createBooking,
        onSuccess: () => {
            toast.success("Đặt xe thành công!");
            queryClient.invalidateQueries({ queryKey: ["car-bookings"] });
            queryClient.invalidateQueries({ queryKey: ["car-stats"] });
            router.push("/cars");
        },
        onError: (error: any) => {
            toast.error("Đặt xe thất bại", { description: error.response?.data?.message });
        },
    });

    const handleCreateBooking = () => {
        if (!newBooking.carId || !newBooking.destination || !newBooking.startTime || !newBooking.endTime) {
            toast.error("Vui lòng nhập đầy đủ thông tin");
            return;
        }
        createBookingMutation.mutate(newBooking);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto w-full pb-10">
            <PageHeader
                title="Đặt xe mới"
                description="Điền thông tin để đăng ký sử dụng xe công ty"
                backHref="/cars"
                icon={
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm text-white">
                        <Calendar className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" onClick={() => router.push("/cars")} className="h-10 px-4">
                            Hủy bỏ
                        </Button>
                        <Button
                            onClick={handleCreateBooking}
                            disabled={createBookingMutation.isPending || !newBooking.carId || !newBooking.destination || !newBooking.startTime || !newBooking.endTime}
                            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {createBookingMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Xác nhận đặt xe
                        </Button>
                    </div>
                }
            />

            <Card className="rounded-xl border shadow-sm">
                <CardHeader className="bg-muted/10 pb-4 border-b">
                    <h3 className="text-lg font-semibold text-foreground">Chi tiết chuyến đi</h3>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                        <Label required>Chọn xe</Label>
                        <Select onValueChange={(v) => setNewBooking({ ...newBooking, carId: v })}>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Chọn xe (chỉ những xe khả dụng hiển thị)" />
                            </SelectTrigger>
                            <SelectContent>
                                {cars?.filter((c: any) => c.status === 'AVAILABLE').map((car: any) => (
                                    <SelectItem key={car.id} value={car.id}>
                                        {car.name} - {car.licensePlate} ({car.seatCount} ghế)
                                    </SelectItem>
                                ))}
                                {cars?.filter((c: any) => c.status === 'AVAILABLE').length === 0 && (
                                    <div className="p-2 text-sm text-muted-foreground text-center">Không có xe khả dụng lúc này</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label required>Địa điểm đến</Label>
                        <Input
                            placeholder="VD: Nhánh văn phòng Quận 2"
                            value={newBooking.destination}
                            onChange={(e) => setNewBooking({ ...newBooking, destination: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Mục đích chuyến đi</Label>
                        <Textarea
                            placeholder="Gặp gỡ đối tác..."
                            value={newBooking.purpose}
                            onChange={(e) => setNewBooking({ ...newBooking, purpose: e.target.value })}
                            className="min-h-[100px]"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label required>Thời gian đi</Label>
                            <DatePicker
                                value={newBooking.startTime}
                                onChange={(date) => setNewBooking({ ...newBooking, startTime: date ? format(date, "yyyy-MM-dd'T'08:30") : "" })}
                                className="h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label required>Thời gian về (Dự kiến)</Label>
                            <DatePicker
                                value={newBooking.endTime}
                                onChange={(date) => setNewBooking({ ...newBooking, endTime: date ? format(date, "yyyy-MM-dd'T'17:30") : "" })}
                                className="h-10"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
