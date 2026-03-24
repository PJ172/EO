"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTodayAttendance, useCheckIn, useCheckOut } from "@/services/timekeeping.service";
import { Loader2, LogIn, LogOut, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/components/ui/toaster";

export function CheckInWidget() {
    const { data: attendance, isLoading, isError } = useTodayAttendance();
    const checkIn = useCheckIn();
    const checkOut = useCheckOut();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Realtime clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleCheckIn = async () => {
        try {
            await checkIn.mutateAsync();
            toast.success("Check-in thành công!");
        } catch (error: any) {
            toast.error("Lỗi Check-in", { description: error?.response?.data?.message });
        }
    };

    const handleCheckOut = async () => {
        try {
            await checkOut.mutateAsync();
            toast.success("Check-out thành công!");
        } catch (error: any) {
            toast.error("Lỗi Check-out", { description: error?.response?.data?.message });
        }
    };

    if (isLoading) return <Card><CardContent className="p-6"><Loader2 className="animate-spin" /></CardContent></Card>;

    const isCheckedIn = !!attendance?.checkIn;
    const isCheckedOut = !!attendance?.checkOut;

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex justify-between items-center">
                    <span>Chấm công hôm nay</span>
                    <span className="text-muted-foreground font-normal text-sm">
                        {format(currentTime, "dd/MM/yyyy")}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center space-y-4">
                    <div className="text-4xl font-bold tracking-tighter tabular-nums">
                        {format(currentTime, "HH:mm:ss")}
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
                            <span className="text-xs text-muted-foreground uppercase">Giờ vào</span>
                            <span className="font-semibold text-lg">
                                {attendance?.checkIn ? format(new Date(attendance.checkIn), "HH:mm") : "--:--"}
                            </span>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
                            <span className="text-xs text-muted-foreground uppercase">Giờ ra</span>
                            <span className="font-semibold text-lg">
                                {attendance?.checkOut ? format(new Date(attendance.checkOut), "HH:mm") : "--:--"}
                            </span>
                        </div>
                    </div>

                    <div className="flex w-full gap-3">
                        {!isCheckedIn ? (
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                size="lg"
                                onClick={handleCheckIn}
                                disabled={checkIn.isPending}
                            >
                                {checkIn.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                                Check In
                            </Button>
                        ) : !isCheckedOut ? (
                            <Button
                                className="w-full"
                                variant="destructive"
                                size="lg"
                                onClick={handleCheckOut}
                                disabled={checkOut.isPending}
                            >
                                {checkOut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                                Check Out
                            </Button>
                        ) : (
                            <Button className="w-full" variant="outline" disabled>
                                Đã hoàn thành công việc
                            </Button>
                        )}
                    </div>

                    {attendance?.workMinutes != null && (
                        <div className="text-sm text-center text-muted-foreground">
                            Tổng thời gian: {Math.floor(attendance.workMinutes / 60)}h {attendance.workMinutes % 60}p
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
