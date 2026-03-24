"use client";

import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiPost, apiGet } from "@/lib/api-client";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Users, Target, Save, LogOut } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

interface Employee {
    id: string;
    fullName: string;
    employeeCode: string;
    department?: { name: string };
}

interface KPIItem {
    name: string;
    target: string;
    weight: number;
}

const DEFAULT_ITEMS: KPIItem[] = [
    { name: "Hoàn thành công việc đúng deadline", target: "≥ 90%", weight: 30 },
    { name: "Chất lượng công việc", target: "Đạt yêu cầu", weight: 25 },
    { name: "Tinh thần làm việc nhóm", target: "Tốt", weight: 20 },
    { name: "Sáng kiến cải tiến", target: "≥ 1 sáng kiến/quý", weight: 15 },
    { name: "Tuân thủ nội quy", target: "100%", weight: 10 },
];

export default function KPIAssignPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const periodId = params.periodId as string;

    const [selectedEmployee, setSelectedEmployee] = useState<string>("");
    const [items, setItems] = useState<KPIItem[]>(DEFAULT_ITEMS);
    const [searchEmployee, setSearchEmployee] = useState("");

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const isValid = selectedEmployee && totalWeight === 100 && items.every((i) => i.name && i.weight > 0);

    const { data: period } = useQuery({
        queryKey: ["kpi-period-meta", periodId],
        queryFn: () => apiGet<any>(`/kpi/periods/${periodId}`).catch(() => null),
        enabled: !!periodId,
    });

    const { data: kpis } = useQuery({
        queryKey: ["kpi-period-kpis", periodId],
        queryFn: () => apiGet<any[]>(`/kpi/periods/${periodId}/kpis`),
        enabled: !!periodId,
    });

    const { data: employeesResponse } = useQuery({
        queryKey: ["employees-for-kpi"],
        queryFn: () => apiGet<any>("/employees?limit=500"),
    });

    const allEmployees = Array.isArray(employeesResponse) ? employeesResponse : (employeesResponse?.data || []);
    const assignedIds = new Set((kpis || []).map((k: any) => k.employeeId));
    const unassignedEmployees = allEmployees.filter((e: any) => !assignedIds.has(e.id));

    const createMutation = useMutation({
        mutationFn: (data: { employeeId: string; periodId: string; items: KPIItem[] }) =>
            apiPost("/kpi", data),
        onSuccess: () => {
            toast.success("Đã gán KPI cho nhân viên!");
            queryClient.invalidateQueries({ queryKey: ["kpi-period-kpis", periodId] });
            router.push(`/kpi/${periodId}`);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Lỗi, không thể gán KPI");
        },
    });

    const handleSubmit = () => {
        if (!isValid) return;
        createMutation.mutate({ employeeId: selectedEmployee, periodId, items });
    };

    const addItem = () => setItems([...items, { name: "", target: "", weight: 0 }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const updateItem = (index: number, field: keyof KPIItem, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const filteredEmployees = unassignedEmployees.filter(
        (e: any) =>
            e.fullName.toLowerCase().includes(searchEmployee.toLowerCase()) ||
            e.employeeCode.toLowerCase().includes(searchEmployee.toLowerCase())
    );

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full space-y-6 pb-10">
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <PageHeader
                    title="Gán KPI cho nhân viên"
                    description={`Kỳ đánh giá: ${period?.name || "..."}`}
                    backHref={`/kpi/${periodId}`}
                    className="mb-0 border-none bg-transparent p-0 shadow-none"
                icon={
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm text-white">
                        <Target className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                }
                actions={
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => router.push(`/kpi/${periodId}`)}>
                            <LogOut className="mr-2 h-4 w-4" /> Hủy
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!isValid || createMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Gán KPI
                        </Button>
                    </div>
                }
            />
            </div>

            <Card className="rounded-xl border shadow-sm">
                <CardHeader className="bg-muted/10 pb-4 border-b">
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Chọn nhân viên
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <Input
                        placeholder="Tìm theo tên hoặc mã nhân viên..."
                        value={searchEmployee}
                        onChange={(e) => setSearchEmployee(e.target.value)}
                    />
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger>
                            <SelectValue placeholder="Chọn nhân viên để gán KPI" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            {filteredEmployees.length === 0 ? (
                                <div className="p-2 text-center text-muted-foreground text-sm">
                                    Không tìm thấy hoặc tất cả đã được gán KPI
                                </div>
                            ) : (
                                filteredEmployees.map((e: any) => (
                                    <SelectItem key={e.id} value={e.id}>
                                        <span className="font-medium">{e.fullName}</span>
                                        <span className="text-muted-foreground ml-2">({e.employeeCode})</span>
                                        {e.department && (
                                            <Badge variant="outline" className="ml-2 text-[10px]">
                                                {e.department.name}
                                            </Badge>
                                        )}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card className="rounded-xl border shadow-sm">
                <CardHeader className="bg-muted/10 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle>Các chỉ tiêu KPI</CardTitle>
                        <Badge variant={totalWeight === 100 ? "default" : "destructive"} className="text-sm px-3 py-1">
                            Tổng trọng số: {totalWeight}%
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                    <div className="grid grid-cols-12 gap-2 px-3 text-sm font-medium text-muted-foreground">
                        <div className="col-span-5">Tên chỉ tiêu</div>
                        <div className="col-span-4">Mục tiêu</div>
                        <div className="col-span-2">Trọng số</div>
                        <div className="col-span-1"></div>
                    </div>

                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 bg-muted/50 rounded-lg">
                            <div className="col-span-5">
                                <Input
                                    placeholder="Tên chỉ tiêu"
                                    value={item.name}
                                    onChange={(e) => updateItem(index, "name", e.target.value)}
                                />
                            </div>
                            <div className="col-span-4">
                                <Input
                                    placeholder="Mục tiêu"
                                    value={item.target}
                                    onChange={(e) => updateItem(index, "target", e.target.value)}
                                />
                            </div>
                            <div className="col-span-2">
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={item.weight}
                                        onChange={(e) => updateItem(index, "weight", parseInt(e.target.value) || 0)}
                                        className="pr-6"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                                </div>
                            </div>
                            <div className="col-span-1 flex justify-center">
                                <Button variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length <= 1}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    <Button variant="outline" className="w-full" onClick={addItem}>
                        <Plus className="mr-2 h-4 w-4" />
                        Thêm chỉ tiêu
                    </Button>

                    {totalWeight !== 100 && (
                        <p className="text-sm text-destructive">
                            ⚠️ Tổng trọng số phải bằng 100% (hiện tại: {totalWeight}%)
                        </p>
                    )}
                </CardContent>
            </Card>
            </div>
        </div>
    );
}
