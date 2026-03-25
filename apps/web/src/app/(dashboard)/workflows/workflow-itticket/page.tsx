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
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    GitMerge, Plus, Trash2, ChevronRight, ArrowRight, GripVertical, Settings, ArrowLeft
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import Link from 'next/link';
import { PermissionGate } from '@/components/auth/permission-gate';
import { apiClient as api } from '@/lib/api-client';
import { toast } from 'sonner';

// ==================== Types ====================
type TicketWorkflowStep = {
    id?: string;
    order: number;
    name: string;
    approverType: 'USER' | 'ROLE' | 'DIRECT_MANAGER' | 'DEPT_MANAGER' | 'IT_STAFF';
    approverId?: string;
};

type TicketWorkflowConfig = {
    id: string;
    name: string;
    description?: string;
    categoryId?: string;
    deptId?: string;
    priority?: string;
    isActive: boolean;
    createdAt: string;
    category?: { name: string };
    department?: { name: string };
    steps: TicketWorkflowStep[];
};

const APPROVER_TYPES = [
    { value: 'DIRECT_MANAGER', label: 'Quản lý trực tiếp' },
    { value: 'DEPT_MANAGER', label: 'Quản lý phòng ban' },
    { value: 'IT_STAFF', label: 'Nhân viên IT' },
    { value: 'ROLE', label: 'Theo vai trò (Role)' },
    { value: 'USER', label: 'Người dùng cụ thể' },
];

// ==================== Main Page ====================
export default function TicketWorkflowAdminPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: workflows = [], isLoading } = useQuery<TicketWorkflowConfig[]>({
        queryKey: ['ticket-workflows'],
        queryFn: () => api.get('/tickets/admin/workflows').then((r: any) => r.data),
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['ticket-categories'],
        queryFn: () => api.get('/tickets/categories').then((r: any) => r.data),
    });

    const { data: departments = [] } = useQuery({
        queryKey: ['admin-departments'],
        queryFn: () => api.get('/tickets/admin/departments').then((r: any) => r.data),
    });

    const { data: roles = [] } = useQuery({
        queryKey: ['admin-roles'],
        queryFn: () => api.get('/tickets/admin/roles').then((r: any) => r.data),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/tickets/admin/workflows/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-workflows'] });
            toast.success('Đã xóa cấu hình workflow');
        },
    });

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-1/3" />
                    <div className="h-64 bg-muted rounded" />
                </div>
            </div>
        );
    }

    return (
        <PermissionGate permissions={['TICKET_MANAGE']}>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2">
                    <PageHeader
                        title="QUY TRÌNH IT TICKET"
                        titleClassName="from-teal-500 to-cyan-700 dark:from-teal-400 dark:to-cyan-400"
                        icon={
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-teal-500 to-cyan-700">
                                <GitMerge className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                            </div>
                        }
                        className="mb-0 border-none bg-transparent p-0 shadow-none"
                    >
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Tạo cấu hình mới
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                <CreateTicketWorkflowForm
                                    categories={categories}
                                    departments={departments}
                                    roles={roles}
                                    onSuccess={() => {
                                        setIsCreateOpen(false);
                                        queryClient.invalidateQueries({ queryKey: ['ticket-workflows'] });
                                    }}
                                />
                            </DialogContent>
                        </Dialog>
                    </PageHeader>
                </div>

                {/* Grid of Workflows */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {workflows.map((wf) => (
                        <Card key={wf.id} className="relative overflow-hidden hover:shadow-lg transition-shadow border-primary/10">
                            <CardHeader className="pb-3 bg-primary/5">
                                <div className="flex items-center justify-between">
                                    <Badge variant={wf.isActive ? 'default' : 'secondary'}>
                                        {wf.isActive ? 'Hoạt động' : 'Tạm dừng'}
                                    </Badge>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-destructive"
                                        onClick={() => {
                                            if(confirm('Bạn có chắc chắn muốn xóa cấu hình này?')) {
                                                deleteMutation.mutate(wf.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <CardTitle className="mt-2 text-lg">{wf.name}</CardTitle>
                                <CardDescription className="line-clamp-1">{wf.description || 'Không có mô tả'}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {wf.category && (
                                        <Badge variant="outline" className="bg-blue-50">DM: {wf.category.name}</Badge>
                                    )}
                                    {wf.department && (
                                        <Badge variant="outline" className="bg-purple-50">PB: {wf.department.name}</Badge>
                                    )}
                                    {wf.priority && (
                                        <Badge variant="outline" className="bg-orange-50">Ưu tiên: {wf.priority}</Badge>
                                    )}
                                </div>

                                <div className="space-y-2 mt-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Luồng duyệt:</p>
                                    <div className="flex flex-col gap-2">
                                        {wf.steps.map((step, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded-md">
                                                <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                                    {step.order}
                                                </Badge>
                                                <span className="font-medium">{step.name}</span>
                                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-auto">
                                                    {APPROVER_TYPES.find(t => t.value === step.approverType)?.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {workflows.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-muted/20 border-2 border-dashed rounded-xl">
                            <GitMerge className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="text-muted-foreground font-medium">Chưa có luồng duyệt nào được cấu hình</p>
                            <p className="text-sm text-muted-foreground mt-1">Hệ thống sẽ mặc định giao ticket cho IT Support</p>
                        </div>
                    )}
                </div>
            </div>
        </PermissionGate>
    );
}

// ==================== Create Form ====================
function CreateTicketWorkflowForm({ categories, departments, roles, onSuccess }: any) {
    const [config, setConfig] = useState({
        name: '',
        description: '',
        categoryId: '',
        deptId: '',
        priority: '',
        isActive: true,
    });
    const [steps, setSteps] = useState<any[]>([
        { order: 1, name: 'Duyệt bước 1', approverType: 'DEPT_MANAGER', approverId: '' }
    ]);

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/tickets/admin/workflows', data),
        onSuccess: () => {
            toast.success('Đã tạo luồng duyệt!');
            onSuccess();
        },
        onError: (err: any) => toast.error(err.message),
    });

    const addStep = () => {
        setSteps([...steps, { order: steps.length + 1, name: `Bước ${steps.length + 1}`, approverType: 'IT_STAFF', approverId: '' }]);
    };

    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 })));
    };

    const updateStep = (index: number, field: string, value: any) => {
        setSteps(steps.map((s, i) => i === index ? { ...s, [field]: value } : s));
    };

    const handleSubmit = () => {
        if (!config.name.trim()) return toast.error('Vui lòng nhập tên cấu hình');
        mutation.mutate({ ...config, steps });
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>Tạo luồng duyệt IT Ticket</DialogTitle>
                <DialogDescription>Xác định các bước phê duyệt dựa trên tiêu chí Ticket</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
                {/* General Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                        <Label>Tên cấu hình *</Label>
                        <Input 
                            placeholder="VD: Luồng duyệt cho Yêu cầu Cấp thiết bị" 
                            value={config.name} 
                            onChange={e => setConfig({ ...config, name: e.target.value })} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Áp dụng cho Danh mục (Tùy chọn)</Label>
                        <Select value={config.categoryId} onValueChange={v => setConfig({ ...config, categoryId: v })}>
                            <SelectTrigger><SelectValue placeholder="Tất cả danh mục" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_none">Tất cả</SelectItem>
                                {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Áp dụng cho Phòng ban (Tùy chọn)</Label>
                        <Select value={config.deptId} onValueChange={v => setConfig({ ...config, deptId: v })}>
                            <SelectTrigger><SelectValue placeholder="Tất cả phòng ban" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_none">Tất cả</SelectItem>
                                {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Steps Section */}
                <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Các bước phê duyệt</h4>
                        <Button type="button" variant="outline" size="sm" onClick={addStep}>
                            <Plus className="h-3 w-3 mr-1" /> Thêm bước
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {steps.map((step, i) => (
                            <div key={i} className="flex gap-4 p-3 border rounded-lg bg-background shadow-sm items-start relative lg:items-center">
                                <Badge className="flex-shrink-0 mt-1 lg:mt-0">{step.order}</Badge>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1">
                                    <Input 
                                        className="h-8 text-xs" 
                                        placeholder="Tên bước" 
                                        value={step.name} 
                                        onChange={e => updateStep(i, 'name', e.target.value)} 
                                    />
                                    <Select value={step.approverType} onValueChange={v => updateStep(i, 'approverType', v)}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {APPROVER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {step.approverType === 'ROLE' && (
                                        <Select value={step.approverId} onValueChange={v => updateStep(i, 'approverId', v)}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn vai trò" /></SelectTrigger>
                                            <SelectContent>
                                                {roles.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-destructive self-start lg:self-center"
                                    onClick={() => removeStep(i)}
                                    disabled={steps.length === 1}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleSubmit} disabled={mutation.isPending}>
                    {mutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
                </Button>
            </DialogFooter>
        </>
    );
}
