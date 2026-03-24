"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { kpiApi } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Save, LogOut } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

export function KPIPeriodForm() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [newPeriod, setNewPeriod] = useState({
        name: "",
        startDate: "",
        endDate: "",
    });

    const createPeriodMutation = useMutation({
        mutationFn: kpiApi.createPeriod,
        onSuccess: () => {
            toast.success("Tạo kỳ đánh giá thành công!");
            queryClient.invalidateQueries({ queryKey: ["kpi-periods"] });
            router.push("/kpi");
        },
        onError: (error: any) => {
            toast.error("Lỗi", {
                description: error.response?.data?.message || "Không thể tạo kỳ đánh giá",
            });
        },
    });

    const handleCreatePeriod = () => {
        if (!newPeriod.name || !newPeriod.startDate || !newPeriod.endDate) {
            toast.error("Vui lòng nhập đầy đủ thông tin");
            return;
        }
        createPeriodMutation.mutate(newPeriod);
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto w-full pb-10">
            <PageHeader
                title="Tạo kỳ đánh giá mới"
                description="Khởi tạo một chu kỳ đánh giá KPI mới cho tổ chức."
                backHref="/kpi"
            />

            <Card className="rounded-xl border shadow-sm">
                <CardHeader className="bg-muted/10 pb-4 border-b">
                    <CardTitle className="text-lg font-semibold text-foreground">
                        Thông tin kỳ đánh giá
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                        <Label>Tên kỳ đánh giá</Label>
                        <Input
                            placeholder="VD: Quý 1 năm 2026..."
                            value={newPeriod.name}
                            onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Ngày bắt đầu</Label>
                            <DatePicker
                                value={newPeriod.startDate}
                                onChange={(date) => setNewPeriod({ ...newPeriod, startDate: date ? format(date, "yyyy-MM-dd") : "" })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Ngày kết thúc</Label>
                            <DatePicker
                                value={newPeriod.endDate}
                                onChange={(date) => setNewPeriod({ ...newPeriod, endDate: date ? format(date, "yyyy-MM-dd") : "" })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={() => router.push("/kpi")} className="px-6">
                            <LogOut className="mr-2 h-4 w-4" /> Hủy
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                            onClick={handleCreatePeriod}
                            disabled={createPeriodMutation.isPending}
                        >
                            {createPeriodMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Khởi tạo
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
