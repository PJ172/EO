"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { carBookingApi } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Car, Loader2, Save } from "lucide-react";

export function CarForm() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [newCar, setNewCar] = useState({ name: "", licensePlate: "", driverName: "", seatCount: 4 });

    const createCarMutation = useMutation({
        mutationFn: carBookingApi.createCar,
        onSuccess: () => {
            toast.success("Thêm xe thành công!");
            queryClient.invalidateQueries({ queryKey: ["cars"] });
            queryClient.invalidateQueries({ queryKey: ["car-stats"] });
            router.push("/cars");
        },
        onError: (error: any) => {
            toast.error("Lỗi", { description: error.response?.data?.message });
        },
    });

    const handleCreateCar = () => {
        if (!newCar.name || !newCar.licensePlate) {
            toast.error("Vui lòng nhập đầy đủ thông tin");
            return;
        }
        createCarMutation.mutate(newCar);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto w-full pb-10">
            <PageHeader
                title="Thêm mới xe"
                description="Khai báo thông tin xe mới vào hệ thống"
                backHref="/cars"
                icon={
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm text-white">
                        <Car className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" onClick={() => router.push("/cars")} className="h-10 px-4">
                            Hủy bỏ
                        </Button>
                        <Button
                            onClick={handleCreateCar}
                            disabled={createCarMutation.isPending || !newCar.name || !newCar.licensePlate}
                            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {createCarMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Lưu thông tin
                        </Button>
                    </div>
                }
            />

            <Card className="rounded-xl border shadow-sm">
                <CardHeader className="bg-muted/10 pb-4 border-b">
                    <h3 className="text-lg font-semibold text-foreground">Thông tin xe</h3>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label required>Tên xe</Label>
                            <Input
                                placeholder="VD: Toyota Innova"
                                value={newCar.name}
                                onChange={(e) => setNewCar({ ...newCar, name: e.target.value })}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label required>Biển số</Label>
                            <Input
                                placeholder="VD: 51A-12345"
                                value={newCar.licensePlate}
                                onChange={(e) => setNewCar({ ...newCar, licensePlate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tài xế (Tùy chọn)</Label>
                            <Input
                                placeholder="VD: Nguyễn Văn A"
                                value={newCar.driverName}
                                onChange={(e) => setNewCar({ ...newCar, driverName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Số ghế</Label>
                            <Input
                                type="number"
                                min={1}
                                value={newCar.seatCount}
                                onChange={(e) => setNewCar({ ...newCar, seatCount: parseInt(e.target.value) || 4 })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
