"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiPatch, apiGet } from "@/lib/api-client";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Target, Save, Calculator, Star, LogOut } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

interface KPIItem {
    id?: string;
    name: string;
    target: string;
    actual: string | null;
    weight: number;
    score: number | null;
    comment: string | null;
}

interface EmployeeKPI {
    id: string;
    employeeId: string;
    status: string;
    totalScore: number | null;
    items: KPIItem[];
    employee?: {
        fullName: string;
        employeeCode: string;
    };
}

export default function KPIScoringPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const periodId = params.periodId as string;
    const kpiId = params.kpiId as string;

    const { data: kpi, isLoading } = useQuery({
        queryKey: ["kpi-item", kpiId],
        queryFn: () => apiGet<EmployeeKPI>(`/kpi/${kpiId}`),
        enabled: !!kpiId,
    });

    const [items, setItems] = useState<KPIItem[]>([]);

    useEffect(() => {
        if (kpi?.items) {
            setItems(kpi.items.map((item: KPIItem) => ({ ...item })));
        }
    }, [kpi]);

    const calculatedScore = items.reduce((sum, item) => {
        if (item.score !== null && item.score >= 0) {
            return sum + (item.score * item.weight) / 100;
        }
        return sum;
    }, 0);

    const allScored = items.every((item) => item.score !== null && item.score >= 0);

    const getScoreColor = (score: number | null) => {
        if (score === null) return "text-muted-foreground";
        if (score >= 90) return "text-green-600";
        if (score >= 70) return "text-blue-600";
        if (score >= 50) return "text-yellow-600";
        return "text-red-600";
    };

    const updateMutation = useMutation({
        mutationFn: (data: { items: KPIItem[] }) => apiPatch(`/kpi/${kpiId}`, data),
        onSuccess: () => {
            toast.success("Đã lưu điểm KPI!");
            queryClient.invalidateQueries({ queryKey: ["kpi-period-kpis", periodId] });
            queryClient.invalidateQueries({ queryKey: ["kpi-period-summary", periodId] });
            router.push(`/kpi/${periodId}`);
        },
        onError: () => {
            toast.error("Lỗi khi lưu điểm KPI");
        },
    });

    const updateItem = (index: number, field: keyof KPIItem, value: string | number | null) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    if (isLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const isFinalized = kpi?.status === "FINALIZED";

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full space-y-6 pb-10">
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <PageHeader
                    title="Chấm điểm KPI"
                    description={`Nhân viên: ${kpi?.employee?.fullName || "..."} (${kpi?.employee?.employeeCode || ""})`}
                    backHref={`/kpi/${periodId}`}
                    className="mb-0 border-none bg-transparent p-0 shadow-none"
                icon={
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-sm text-white">
                        <Target className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                }
                actions={
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => router.push(`/kpi/${periodId}`)}>
                            <LogOut className="mr-2 h-4 w-4" /> Trở về
                        </Button>
                        {!isFinalized && (
                            <Button
                                onClick={() => updateMutation.mutate({ items })}
                                disabled={updateMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Lưu điểm
                            </Button>
                        )}
                    </div>
                }
            />
            </div>

            {/* Score Summary Card */}
            <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-full">
                            <Calculator className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Tổng điểm (tính toán)</p>
                            <p className={`text-2xl font-bold ${getScoreColor(calculatedScore)}`}>
                                {calculatedScore.toFixed(1)} / 100
                            </p>
                        </div>
                    </div>
                    {allScored && (
                        <Badge className="bg-green-100 text-green-700">
                            <Star className="mr-1 h-3 w-3" />
                            Đã chấm đủ
                        </Badge>
                    )}
                </div>
            </Card>

            {/* Items */}
            <div className="space-y-4">
                {items.map((item, index) => (
                    <Card key={index} className="rounded-xl border shadow-sm">
                        <CardContent className="p-5 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-xs">{item.weight}%</Badge>
                                        <span className="font-semibold text-base">{item.name}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Mục tiêu: <span className="text-foreground">{item.target || "-"}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                                        {item.score !== null ? item.score : "-"}
                                    </span>
                                    <span className="text-muted-foreground text-sm"> điểm</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Kết quả thực tế</Label>
                                    <Input
                                        placeholder="Nhập kết quả..."
                                        value={item.actual || ""}
                                        onChange={(e) => updateItem(index, "actual", e.target.value)}
                                        disabled={isFinalized}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Điểm (0-100)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        placeholder="0-100"
                                        value={item.score ?? ""}
                                        onChange={(e) =>
                                            updateItem(
                                                index,
                                                "score",
                                                e.target.value ? parseInt(e.target.value) : null
                                            )
                                        }
                                        disabled={isFinalized}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Nhận xét</Label>
                                <Textarea
                                    placeholder="Ghi chú, nhận xét..."
                                    value={item.comment || ""}
                                    onChange={(e) => updateItem(index, "comment", e.target.value)}
                                    rows={2}
                                    disabled={isFinalized}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            </div>
        </div>
    );
}
