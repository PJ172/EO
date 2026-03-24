'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    GitMerge, Plus, Trash2, ChevronRight, ArrowRight, GripVertical, Settings, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { PermissionGate } from '@/components/auth/permission-gate';
import { apiClient as api } from '@/lib/api-client';
import { toast } from 'sonner';

// ==================== Types ====================
type FormField = {
    id: string; // client-side only
    type: 'text' | 'number' | 'date' | 'select' | 'textarea';
    name: string;
    label: string;
    required: boolean;
    options?: string; // For select, comma-separated
};

type WorkflowStep = {
    id?: string;
    order: number;
    name: string;
    type: 'SEQUENTIAL' | 'PARALLEL';
    condition?: string;
    approverRoleId?: string;
    approverUserId?: string;
    isFinal: boolean;
};

type Workflow = {
    id: string;
    code: string;
    name: string;
    description?: string;
    formSchema?: any;
    isActive: boolean;
    createdAt: string;
    steps: WorkflowStep[];
    _count?: { requests: number };
};

type Role = { id: string; name: string; code: string };

// ==================== Main Page ====================
export default function WorkflowAdminPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
        queryKey: ['workflows'],
        queryFn: () => api.get('/workflows').then(r => r.data),
    });

    const { data: roles = [] } = useQuery<Role[]>({
        queryKey: ['workflow-roles'],
        queryFn: () => api.get('/workflows/roles').then(r => r.data),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/workflows/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] });
            toast.success('Đã xóa/vô hiệu quy trình');
        },
    });

    if (isLoading) {
        return (
            <PermissionGate permissions={['WORKFLOW_MANAGE']}>
                <div className="p-6 space-y-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-muted rounded w-1/3" />
                        <div className="h-64 bg-muted rounded" />
                    </div>
                </div>
            </PermissionGate>
        );
    }

    return (
        <PermissionGate permissions={['WORKFLOW_MANAGE']}>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/settings" className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Quay về Cài đặt">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <GitMerge className="h-6 w-6 text-primary" />
                                Quản lý quy trình duyệt
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Cấu hình các bước duyệt cho tờ trình và yêu cầu
                            </p>
                        </div>
                    </div>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Tạo quy trình mới
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                            <CreateWorkflowForm
                                roles={roles}
                                onSuccess={() => {
                                    setIsCreateOpen(false);
                                    queryClient.invalidateQueries({ queryKey: ['workflows'] });
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Workflows Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Danh sách quy trình ({workflows.length})</CardTitle>
                        <CardDescription>Các quy trình duyệt đang hoạt động</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {workflows.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <GitMerge className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                <p>Chưa có quy trình nào</p>
                                <p className="text-sm">Nhấn &quot;Tạo quy trình mới&quot; để bắt đầu</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                                    <TableRow>
                                        <TableHead>Mã</TableHead>
                                        <TableHead>Tên quy trình</TableHead>
                                        <TableHead>Các bước duyệt</TableHead>
                                        <TableHead className="text-center">Số tờ trình</TableHead>
                                        <TableHead className="text-center">Trạng thái</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {workflows.map((wf) => (
                                        <TableRow key={wf.id}>
                                            <TableCell className="font-mono text-sm">{wf.code}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <span className="font-medium">{wf.name}</span>
                                                    {wf.description && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">{wf.description}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center flex-wrap gap-1">
                                                    {wf.steps.map((step, i) => (
                                                        <div key={step.id || i} className="flex items-center gap-1">
                                                            <Badge variant={step.isFinal ? 'default' : 'outline'} className="text-xs">
                                                                {step.order}. {step.name}
                                                                {step.type === 'PARALLEL' && ' (Song song)'}
                                                            </Badge>
                                                            {i < wf.steps.length - 1 && (
                                                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{wf._count?.requests ?? 0}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={wf.isActive ? 'default' : 'destructive'}>
                                                    {wf.isActive ? 'Hoạt động' : 'Tắt'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteMutation.mutate(wf.id)}
                                                    disabled={deleteMutation.isPending}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PermissionGate>
    );
}

// ==================== Create Workflow Form ====================
function CreateWorkflowForm({ roles, onSuccess }: { roles: Role[]; onSuccess: () => void }) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [formSchema, setFormSchema] = useState<FormField[]>([]);
    const [steps, setSteps] = useState<WorkflowStep[]>([
        { order: 1, name: '', type: 'SEQUENTIAL', isFinal: true }
    ]);

    const addFormField = () => {
        setFormSchema(prev => [
            ...prev,
            { id: Date.now().toString(), type: 'text', name: `field_${prev.length + 1}`, label: 'Trường mới', required: false }
        ]);
    };

    const updateFormField = (id: string, field: keyof FormField, value: any) => {
        setFormSchema(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const removeFormField = (id: string) => {
        setFormSchema(prev => prev.filter(f => f.id !== id));
    };

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post('/workflows', data),
        onSuccess: () => {
            toast.success('Tạo quy trình thành công!');
            onSuccess();
        },
        onError: (err: any) => {
            toast.error(`Lỗi: ${err.message}`);
        },
    });

    const addStep = () => {
        const newOrder = steps.length + 1;
        // Move isFinal to new step
        setSteps(prev => [
            ...prev.map(s => ({ ...s, isFinal: false })),
            { order: newOrder, name: '', type: 'SEQUENTIAL', isFinal: true }
        ]);
    };

    const removeStep = (index: number) => {
        setSteps(prev => {
            const updated = prev.filter((_, i) => i !== index);
            // Re-order and set last as final
            return updated.map((s, i) => ({
                ...s,
                order: i + 1,
                isFinal: i === updated.length - 1,
            }));
        });
    };

    const updateStep = (index: number, field: keyof WorkflowStep, value: any) => {
        setSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    };

    const handleSubmit = () => {
        if (!name || !code) {
            toast.error('Vui lòng nhập tên và mã quy trình');
            return;
        }
        if (steps.some(s => !s.name)) {
            toast.error('Vui lòng nhập tên cho tất cả các bước');
            return;
        }

        // Optional form validation
        const hasEmptyField = formSchema.some(f => !f.name || !f.label);
        if (hasEmptyField) {
            toast.error('Có một trường dữ liệu mẫu chưa nhập Tên (name) hoặc Nhãn (label)');
            return;
        }

        createMutation.mutate({
            name,
            code,
            description,
            formSchema, // Pass the schema object to backend
            steps
        });
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Tạo quy trình duyệt mới
                </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Tên quy trình *</Label>
                        <Input
                            placeholder="VD: Quy trình đề xuất chung"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Mã quy trình *</Label>
                        <Input
                            placeholder="VD: WF-GENERAL"
                            value={code}
                            onChange={e => setCode(e.target.value.toUpperCase())}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Input
                        placeholder="Mô tả ngắn về quy trình"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
                </div>

                {/* Form Builder / Schema Designer */}
                <div className="space-y-2 border-t pt-4 mt-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-base font-semibold text-primary">Biểu mẫu Tờ trình (Dynamic Form)</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Xây dựng form nhập liệu riêng cho loại quy trình này</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addFormField}>
                            <Plus className="h-3 w-3 mr-1" /> Thêm trường dữ liệu
                        </Button>
                    </div>

                    {formSchema.length === 0 ? (
                        <div className="text-center py-4 bg-muted/20 border border-dashed rounded-lg text-sm text-muted-foreground">
                            Chưa có trường dữ liệu nào. Tờ trình sẽ chỉ có Tiêu đề và Nội dung mặc định.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {formSchema.map((field, i) => (
                                <div key={field.id} className="flex gap-2 p-3 bg-muted/10 border rounded-lg">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-1">
                                        <div>
                                            <Label className="text-[10px] text-muted-foreground uppercase">Tên trường (Variable) *</Label>
                                            <Input className="h-8 text-sm" value={field.name} onChange={e => updateFormField(field.id, 'name', e.target.value.toLowerCase().replace(/\s+/g, '_'))} placeholder="vi_du: so_tien" />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] text-muted-foreground uppercase">Tên hiển thị (Label) *</Label>
                                            <Input className="h-8 text-sm" value={field.label} onChange={e => updateFormField(field.id, 'label', e.target.value)} placeholder="Số tiền tạm ứng" />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] text-muted-foreground uppercase">Loại dữ liệu</Label>
                                            <Select value={field.type} onValueChange={(v: any) => updateFormField(field.id, 'type', v)}>
                                                <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="text">Văn bản ngắn</SelectItem>
                                                    <SelectItem value="textarea">Văn bản dài</SelectItem>
                                                    <SelectItem value="number">Số / Tiền</SelectItem>
                                                    <SelectItem value="date">Ngày tháng</SelectItem>
                                                    <SelectItem value="select">Lựa chọn Dropdown</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {field.type === 'select' ? (
                                            <div>
                                                <Label className="text-[10px] text-muted-foreground uppercase">Các tùy chọn</Label>
                                                <Input className="h-8 text-sm" placeholder="VD: Option 1, Option 2" value={field.options || ''} onChange={e => updateFormField(field.id, 'options', e.target.value)} />
                                            </div>
                                        ) : (
                                            <div className="flex items-end pb-1.5 ml-2">
                                                <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                                                    <input type="checkbox" className="w-4 h-4 rounded appearance-none checked:bg-primary border" checked={field.required} onChange={e => updateFormField(field.id, 'required', e.target.checked)} />
                                                    <span className={field.required ? 'text-primary' : 'text-muted-foreground'}>Bắt buộc</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive self-end" onClick={() => removeFormField(field.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Steps */}
                <div className="space-y-2 border-t pt-4 mt-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Các bước duyệt</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addStep}>
                            <Plus className="h-3 w-3 mr-1" /> Thêm bước
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {steps.map((step, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30"
                            >
                                <div className="flex items-center gap-1 pt-2">
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    <Badge variant="outline" className="min-w-[28px] justify-center">
                                        {step.order}
                                    </Badge>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Input
                                        placeholder="Tên bước, VD: Trưởng phòng duyệt"
                                        value={step.name}
                                        onChange={e => updateStep(i, 'name', e.target.value)}
                                    />
                                    <Select
                                        value={step.approverRoleId || '_none'}
                                        onValueChange={v => updateStep(i, 'approverRoleId', v === '_none' ? undefined : v)}
                                    >
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Chọn vai trò người duyệt (Role)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_none">-- Ai cũng duyệt được --</SelectItem>
                                            {roles.map(role => (
                                                <SelectItem key={role.id} value={role.id}>
                                                    {role.name} ({role.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Routing condition (Conditional branches) */}
                                <div className="flex-1 space-y-2 pt-2 border-l pl-3 ml-1 border-dashed">
                                    <Select
                                        value={step.type}
                                        onValueChange={v => updateStep(i, 'type', v)}
                                    >
                                        <SelectTrigger className="h-8 text-xs font-semibold text-primary">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SEQUENTIAL">Chờ bước trước duyệt xong</SelectItem>
                                            <SelectItem value="PARALLEL">Duyệt song song (Cùng lúc)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        className="h-8 text-xs font-mono"
                                        placeholder="Điều kiện chay JSON (Tùy chọn)"
                                        value={step.condition || ''}
                                        onChange={e => updateStep(i, 'condition', e.target.value)}
                                    />
                                </div>

                                <div className="flex flex-col items-center gap-2 pt-2 justify-between h-full">
                                    {step.isFinal && (
                                        <Badge className="text-[10px]">Cuối</Badge>
                                    )}
                                    {i > 0 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => removeStep(i)}
                                        >
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Preview flow */}
                    {steps.length > 0 && (
                        <div className="mt-3 p-3 bg-primary/5 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Luồng duyệt:</p>
                            <div className="flex items-center flex-wrap gap-1 text-sm">
                                <Badge variant="secondary" className="text-xs">Nhân viên tạo</Badge>
                                {steps.map((step, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        <Badge variant={step.isFinal ? 'default' : 'outline'} className="text-xs">
                                            {step.name || `Bước ${step.order}`}
                                        </Badge>
                                    </div>
                                ))}
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                <Badge className="bg-green-600 text-xs">✅ Hoàn thành</Badge>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Đang tạo...' : 'Tạo quy trình'}
                </Button>
            </DialogFooter>
        </>
    );
}
