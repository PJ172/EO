"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { requestApi, apiClient as api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { Loader2, ArrowLeft, ChevronRight, GitMerge } from "lucide-react";
import Link from "next/link";

const requestSchema = z.object({
    title: z.string().min(1, "Vui lòng nhập tiêu đề"),
    type: z.enum(["GENERAL", "PAYMENT", "PURCHASE", "PROPOSAL"] as const),
    content: z.string().min(1, "Vui lòng nhập nội dung"),
    workflowId: z.string().optional(),
    formData: z.record(z.string(), z.any()).optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

export default function CreateRequestPage() {
    const router = useRouter();
    const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<RequestFormData>({
        resolver: zodResolver(requestSchema),
        defaultValues: {
            type: "GENERAL",
        },
    });

    const selectedWorkflowId = watch("workflowId");

    const { data: workflows = [] } = useQuery<any[]>({
        queryKey: ['workflows-list'],
        queryFn: () => api.get('/workflows').then(r => r.data),
    });

    const selectedWorkflow = workflows.find((wf: any) => wf.id === selectedWorkflowId);

    const onSubmit = async (data: RequestFormData) => {
        try {
            // Check dynamic field requirements
            const formSchema = selectedWorkflow?.formSchema || [];
            const dynamicData = data.formData || {};
            for (const field of formSchema) {
                if (field.required && !dynamicData[field.name]) {
                    toast.error(`Vui lòng nhập trường: ${field.label}`);
                    return;
                }
            }

            const payload: any = {
                title: data.title,
                type: data.type,
                content: data.content,
                formData: dynamicData,
            };
            if (data.workflowId && data.workflowId !== '_none') {
                payload.workflowId = data.workflowId;
            }
            await requestApi.create(payload);
            toast.success("Tạo tờ trình thành công!");
            router.push("/requests");
        } catch (error: any) {
            toast.error("Tạo thất bại", {
                description: error.response?.data?.message || error.message || "Đã có lỗi xảy ra",
            });
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center">
                <Link href="/requests" className="mr-4">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h2 className="text-2xl font-bold tracking-tight">Tạo tờ trình mới</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Thông tin tờ trình</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label>Tiêu đề *</Label>
                            <Input {...register("title")} placeholder="Ví dụ: Đề xuất mua thiết bị..." />
                            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Loại tờ trình</Label>
                                <Select onValueChange={(val) => setValue("type", val as any)} defaultValue="GENERAL">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn loại tờ trình" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GENERAL">Tờ trình chung</SelectItem>
                                        <SelectItem value="PURCHASE">Đề xuất mua sắm</SelectItem>
                                        <SelectItem value="PAYMENT">Đề xuất thanh toán</SelectItem>
                                        <SelectItem value="PROPOSAL">Đề xuất khác</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Quy trình duyệt</Label>
                                <Select onValueChange={(val) => {
                                    setValue("workflowId", val === '_none' ? undefined : val);
                                    setValue("formData", {}); // reset form data on workflow change
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn quy trình (không bắt buộc)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">-- Không chọn quy trình --</SelectItem>
                                        {workflows.map((wf: any) => (
                                            <SelectItem key={wf.id} value={wf.id}>
                                                {wf.name} ({wf.steps?.length || 0} bước) {wf.formSchema?.length ? ' - Có Form' : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Workflow preview */}
                        {selectedWorkflow && (
                            <div className="p-4 bg-primary/5 rounded-lg border space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                        <GitMerge className="h-4 w-4 text-primary" />
                                        Luồng duyệt: {selectedWorkflow.name}
                                    </div>
                                    <div className="flex items-center flex-wrap gap-1 text-xs">
                                        <Badge variant="secondary">Bạn tạo</Badge>
                                        {selectedWorkflow.steps?.map((step: any, i: number) => (
                                            <div key={i} className="flex items-center gap-1">
                                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                <Badge variant={step.isFinal ? 'default' : 'outline'}>
                                                    {step.order}. {step.name} {step.type === 'PARALLEL' && '(Song song)'}
                                                </Badge>
                                            </div>
                                        ))}
                                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        <Badge className="bg-green-600">✅ Hoàn thành</Badge>
                                    </div>
                                </div>

                                {/* Dynamic Form Render */}
                                {selectedWorkflow.formSchema?.length > 0 && (
                                    <div className="pt-4 border-t border-primary/10">
                                        <h4 className="text-sm font-semibold mb-3">Biểu mẫu dữ liệu bổ sung</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {selectedWorkflow.formSchema.map((field: any) => (
                                                <div key={field.name} className="space-y-2">
                                                    <Label className="text-sm">
                                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                                    </Label>

                                                    {field.type === 'text' && (
                                                        <Input {...register(`formData.${field.name}` as any)} placeholder={`Nhập ${field.label.toLowerCase()}...`} />
                                                    )}

                                                    {field.type === 'number' && (
                                                        <Input type="number" {...register(`formData.${field.name}` as any)} placeholder="0" />
                                                    )}

                                                    {field.type === 'date' && (
                                                        <Input type="date" {...register(`formData.${field.name}` as any)} />
                                                    )}

                                                    {field.type === 'textarea' && (
                                                        <Textarea className="min-h-[80px]" {...register(`formData.${field.name}` as any)} placeholder={`Nhập ${field.label.toLowerCase()}...`} />
                                                    )}

                                                    {field.type === 'select' && (
                                                        <Select onValueChange={(val) => setValue(`formData.${field.name}` as any, val)}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={`Chọn ${field.label}`} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {field.options?.split(',').map((opt: string) => opt.trim()).map((opt: string) => (
                                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Nội dung *</Label>
                            <Textarea
                                {...register("content")}
                                placeholder="Nhập nội dung tờ trình..."
                                className="min-h-[200px]"
                            />
                            {errors.content && <p className="text-sm text-red-500">{errors.content.message}</p>}
                        </div>

                        <div className="flex justify-end gap-4">
                            <Link href="/requests">
                                <Button variant="outline" type="button">Hủy</Button>
                            </Link>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Tạo tờ trình
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
