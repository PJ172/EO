"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { requestApi } from "@/lib/api-client";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { Loader2, ArrowLeft, CheckCircle, XCircle, Clock, Send, FileText, GitMerge } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useState } from "react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    DRAFT: { label: "Nháp", variant: "secondary" },
    SUBMITTED: { label: "Chờ duyệt", variant: "outline" },
    IN_PROGRESS: { label: "Đang xử lý", variant: "default" },
    APPROVED: { label: "Đã duyệt", variant: "default" },
    REJECTED: { label: "Từ chối", variant: "destructive" },
    CANCELLED: { label: "Đã hủy", variant: "secondary" },
};

const TYPE_MAP: Record<string, string> = {
    PAYMENT: "Đề xuất thanh toán",
    PURCHASE: "Đề xuất mua sắm",
    PROPOSAL: "Đề xuất",
    GENERAL: "Tờ trình chung",
    GENERIC: "Tờ trình chung",
    LEAVE: "Xin nghỉ phép",
};

export default function RequestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const id = params.id as string;

    const [comment, setComment] = useState("");
    const [showApprovalForm, setShowApprovalForm] = useState(false);

    const { data: request, isLoading } = useQuery({
        queryKey: ["request", id],
        queryFn: () => requestApi.getOne(id),
    });

    const submitMutation = useMutation({
        mutationFn: () => requestApi.submit(id),
        onSuccess: () => {
            toast.success("Đã gửi duyệt thành công!");
            queryClient.invalidateQueries({ queryKey: ["request", id] });
        },
        onError: (error: any) => {
            toast.error("Gửi duyệt thất bại", {
                description: error.response?.data?.message || error.message,
            });
        },
    });

    const approveMutation = useMutation({
        mutationFn: () => requestApi.approve(id, comment),
        onSuccess: () => {
            toast.success("Đã phê duyệt thành công!");
            queryClient.invalidateQueries({ queryKey: ["request", id] });
            setShowApprovalForm(false);
            setComment("");
        },
        onError: (error: any) => {
            toast.error("Phê duyệt thất bại", {
                description: error.response?.data?.message || error.message,
            });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: () => requestApi.reject(id, comment),
        onSuccess: () => {
            toast.success("Đã từ chối tờ trình!");
            queryClient.invalidateQueries({ queryKey: ["request", id] });
            setShowApprovalForm(false);
            setComment("");
        },
        onError: (error: any) => {
            toast.error("Từ chối thất bại", {
                description: error.response?.data?.message || error.message,
            });
        },
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!request) {
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">Không tìm thấy tờ trình</p>
            </div>
        );
    }

    const statusInfo = STATUS_MAP[request.status] || { label: request.status, variant: "secondary" };
    const typeLabel = TYPE_MAP[request.type] || request.type;
    const canSubmit = request.status === "DRAFT";
    const canReview = request.status === "SUBMITTED" || request.status === "IN_PROGRESS";

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/requests">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">{request.title}</h1>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">
                        Mã: {request.code} • {typeLabel} • Tạo ngày {format(new Date(request.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                    </p>
                </div>
            </div>

            {/* Content Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Nội dung tờ trình
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div
                        className="prose max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: request.content }}
                    />
                </CardContent>
            </Card>

            {/* Dynamic Form Data rendering */}
            {request.formData && Object.keys(request.formData).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Dữ liệu bổ sung (Biểu mẫu động)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(request.formData).map(([key, value]) => {
                                // Try to find label in schema
                                const schemaField = request.workflow?.formSchema?.find((f: any) => f.name === key);
                                const label = schemaField ? schemaField.label : key;

                                return (
                                    <div key={key} className="space-y-1 p-3 bg-muted/20 border rounded-lg">
                                        <p className="text-sm font-medium text-muted-foreground">{label}</p>
                                        <p className="text-base font-semibold">
                                            {typeof value === 'boolean' ? (value ? 'Có' : 'Không')
                                                : value == null || value === '' ? <span className="text-muted-foreground italic">Trống</span>
                                                    : String(value)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Workflow Stepper Timeline */}
            {request.workflow && request.workflow.steps?.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GitMerge className="h-5 w-5" />
                            Quy trình duyệt: {request.workflow.name}
                        </CardTitle>
                        <CardDescription>{request.workflow.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            {request.workflow.steps.map((step: any, i: number) => {
                                const approval = request.approvals?.find((a: any) => a.stepOrder === step.order);
                                const isCurrent = request.currentStepOrder === step.order && request.status === 'IN_PROGRESS';
                                const isCompleted = approval?.status === 'APPROVED';
                                const isRejected = approval?.status === 'REJECTED';
                                const isPending = isCurrent && (!approval || approval.status === 'PENDING');
                                const isFuture = step.order > request.currentStepOrder && request.status === 'IN_PROGRESS';

                                return (
                                    <div key={step.id || i} className="flex items-start gap-4 pb-6 last:pb-0">
                                        {/* Step indicator */}
                                        <div className="flex flex-col items-center">
                                            <div className={`rounded-full w-10 h-10 flex items-center justify-center border-2 text-sm font-bold
                                                ${isCompleted ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                                    isRejected ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                                        isPending ? 'bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 animate-pulse' :
                                                            isFuture ? 'bg-muted border-muted-foreground/30 text-muted-foreground' :
                                                                'bg-muted border-muted-foreground/30 text-muted-foreground'
                                                }
                                            `}>
                                                {isCompleted ? <CheckCircle className="h-5 w-5" /> :
                                                    isRejected ? <XCircle className="h-5 w-5" /> :
                                                        isPending ? <Clock className="h-5 w-5" /> :
                                                            step.order
                                                }
                                            </div>
                                            {i < request.workflow.steps.length - 1 && (
                                                <div className={`w-0.5 h-8 mt-1 ${isCompleted ? 'bg-green-500' : 'bg-muted-foreground/20'}`} />
                                            )}
                                        </div>

                                        {/* Step content */}
                                        <div className="flex-1 min-w-0 pt-1">
                                            <div className="flex items-center gap-2">
                                                <p className={`font-medium ${isCompleted ? 'text-green-700 dark:text-green-400' :
                                                    isRejected ? 'text-red-700 dark:text-red-400' :
                                                        isPending ? 'text-yellow-700 dark:text-yellow-400' :
                                                            'text-muted-foreground'
                                                    }`}>
                                                    {step.name}
                                                </p>
                                                {step.isFinal && <Badge variant="outline" className="text-[10px]">Bước cuối</Badge>}
                                                {isPending && <Badge className="bg-yellow-500 text-[10px]">Đang chờ</Badge>}
                                            </div>
                                            {approval && (
                                                <div className="mt-1 text-sm text-muted-foreground">
                                                    {approval.status === 'APPROVED' && (
                                                        <span>✅ Đã duyệt {approval.reviewedAt && `lúc ${format(new Date(approval.reviewedAt), "dd/MM/yyyy HH:mm", { locale: vi })}`}</span>
                                                    )}
                                                    {approval.status === 'REJECTED' && (
                                                        <span>❌ Từ chối {approval.reviewedAt && `lúc ${format(new Date(approval.reviewedAt), "dd/MM/yyyy HH:mm", { locale: vi })}`}</span>
                                                    )}
                                                    {approval.comment && (
                                                        <p className="mt-0.5 italic">&quot;{approval.comment}&quot;</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Simple Approval History (no workflow) */}
            {!request.workflow && request.approvals && request.approvals.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Lịch sử phê duyệt</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {request.approvals.map((approval: any, index: number) => (
                                <div key={approval.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                                    <div className={`mt-1 rounded-full p-1 ${approval.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                                        approval.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                                            'bg-yellow-100 text-yellow-600'
                                        }`}>
                                        {approval.status === 'APPROVED' && <CheckCircle className="h-4 w-4" />}
                                        {approval.status === 'REJECTED' && <XCircle className="h-4 w-4" />}
                                        {approval.status === 'PENDING' && <Clock className="h-4 w-4" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-medium">
                                                {approval.status === 'APPROVED' && 'Đã phê duyệt'}
                                                {approval.status === 'REJECTED' && 'Đã từ chối'}
                                                {approval.status === 'PENDING' && 'Chờ phê duyệt'}
                                            </p>
                                            {approval.reviewedAt && (
                                                <span className="text-sm text-muted-foreground">
                                                    {format(new Date(approval.reviewedAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                                                </span>
                                            )}
                                        </div>
                                        {approval.comment && (
                                            <p className="text-sm text-muted-foreground mt-1">&quot;{approval.comment}&quot;</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <Card>
                <CardContent className="pt-6">
                    {canSubmit && (
                        <Button
                            onClick={() => submitMutation.mutate()}
                            disabled={submitMutation.isPending}
                            className="w-full"
                        >
                            {submitMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            Gửi duyệt
                        </Button>
                    )}

                    {canReview && !showApprovalForm && (
                        <Button
                            onClick={() => setShowApprovalForm(true)}
                            className="w-full"
                        >
                            Xử lý tờ trình
                        </Button>
                    )}

                    {canReview && showApprovalForm && (
                        <div className="space-y-4">
                            <Textarea
                                placeholder="Nhận xét (không bắt buộc)"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={3}
                            />
                            <div className="flex gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowApprovalForm(false)}
                                    className="flex-1"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => rejectMutation.mutate()}
                                    disabled={rejectMutation.isPending}
                                    className="flex-1"
                                >
                                    {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Từ chối
                                </Button>
                                <Button
                                    onClick={() => approveMutation.mutate()}
                                    disabled={approveMutation.isPending}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                    {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Phê duyệt
                                </Button>
                            </div>
                        </div>
                    )}

                    {!canSubmit && !canReview && (
                        <p className="text-center text-muted-foreground">
                            Tờ trình đã được xử lý
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
