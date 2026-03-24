"use client";

import { useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLeaves, useApproveLeave } from "@/services/leave.service";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarCheck, CalendarX, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";

function LeaveApprovalContent() {
    const params = useParams();
    const router = useRouter();
    const leaveId = params.id as string;
    const searchParams = useSearchParams();
    const defaultDecision = searchParams.get("decision") as "APPROVED" | "REJECTED" | null;

    const [decision, setDecision] = useState<"APPROVED" | "REJECTED">(defaultDecision || "APPROVED");
    const [comment, setComment] = useState("");
    const approveLeave = useApproveLeave();

    const { data: leave, isLoading } = useQuery({
        queryKey: ["leave-detail", leaveId],
        queryFn: () => apiGet<any>(`/leaves/${leaveId}`),
        enabled: !!leaveId,
    });

    const handleApprove = async () => {
        try {
            await approveLeave.mutateAsync({ id: leaveId, decision, comment });
            toast.success(`Đã ${decision === "APPROVED" ? "duyệt" : "từ chối"} đơn thành công`);
            router.push("/leaves");
        } catch {
            toast.error("Lỗi xử lý đơn");
        }
    };

    if (isLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full space-y-6 pb-10">
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <PageHeader
                    title={decision === "APPROVED" ? "Phê duyệt đơn nghỉ phép" : "Từ chối đơn nghỉ phép"}
                    description="Xử lý đơn xin nghỉ phép của nhân viên."
                    backHref="/leaves"
                    className="mb-0 border-none bg-transparent p-0 shadow-none"
                icon={
                    <div className={`h-8 w-8 md:h-10 md:w-10 rounded-xl flex items-center justify-center shadow-sm text-white ${decision === "APPROVED" ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-red-500 to-rose-600"}`}>
                        {decision === "APPROVED" ? <CalendarCheck className="h-4 w-4 md:h-5 md:w-5" /> : <CalendarX className="h-4 w-4 md:h-5 md:w-5" />}
                    </div>
                }
                actions={
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => router.push("/leaves")}>Hủy bỏ</Button>
                        <Button
                            onClick={handleApprove}
                            disabled={approveLeave.isPending}
                            className={decision === "APPROVED" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
                        >
                            {approveLeave.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : decision === "APPROVED" ? <CalendarCheck className="mr-2 h-4 w-4" /> : <CalendarX className="mr-2 h-4 w-4" />}
                            {decision === "APPROVED" ? "Phê duyệt" : "Từ chối"}
                        </Button>
                    </div>
                }
            />
            </div>

            {leave && (
                <Card className="rounded-xl border shadow-sm">
                    <CardHeader className="bg-muted/10 pb-4 border-b">
                        <CardTitle>Thông tin đơn nghỉ phép</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium text-muted-foreground">Nhân viên:</span>
                                <p className="font-semibold">{leave.employee?.fullName}</p>
                                <p className="text-muted-foreground text-xs">{leave.employee?.employeeCode}</p>
                            </div>
                            <div>
                                <span className="font-medium text-muted-foreground">Loại nghỉ:</span>
                                <p className="font-semibold">{leave.leaveType?.name}</p>
                            </div>
                            <div>
                                <span className="font-medium text-muted-foreground">Từ ngày:</span>
                                <p className="font-semibold">{format(new Date(leave.startDatetime), "dd/MM/yyyy HH:mm")}</p>
                            </div>
                            <div>
                                <span className="font-medium text-muted-foreground">Đến ngày:</span>
                                <p className="font-semibold">{format(new Date(leave.endDatetime), "dd/MM/yyyy HH:mm")}</p>
                            </div>
                            {leave.reason && (
                                <div className="col-span-2">
                                    <span className="font-medium text-muted-foreground">Lý do:</span>
                                    <p>{leave.reason}</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t space-y-2">
                            <div className="flex gap-3">
                                <Button
                                    variant={decision === "APPROVED" ? "default" : "outline"}
                                    className={decision === "APPROVED" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                                    onClick={() => setDecision("APPROVED")}
                                >
                                    <CalendarCheck className="mr-2 h-4 w-4" /> Duyệt
                                </Button>
                                <Button
                                    variant={decision === "REJECTED" ? "destructive" : "outline"}
                                    onClick={() => setDecision("REJECTED")}
                                >
                                    <CalendarX className="mr-2 h-4 w-4" /> Từ chối
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ghi chú (tùy chọn)</label>
                            <Textarea
                                placeholder="Nhập lý do phê duyệt hoặc từ chối..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
            </div>
        </div>
    );
}

export default function LeaveApprovalPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <LeaveApprovalContent />
        </Suspense>
    );
}
