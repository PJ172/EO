"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, Package, UserCheck, ArrowRight, Shield, QrCode, ClipboardList, Loader2, Save } from 'lucide-react';
import { apiClient as api } from '@/lib/api-client';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    AVAILABLE: { label: 'Sẵn sàng', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    IN_USE: { label: 'Đang sử dụng', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    MAINTENANCE: { label: 'Bảo trì', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    RETIRED: { label: 'Thanh lý', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
    LOST: { label: 'Mất', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

const CONDITION_CONFIG: Record<string, { label: string; emoji: string }> = {
    NEW: { label: 'Mới', emoji: '✨' },
    GOOD: { label: 'Tốt', emoji: '👍' },
    FAIR: { label: 'Trung bình', emoji: '👌' },
    POOR: { label: 'Kém', emoji: '⚠️' },
    BROKEN: { label: 'Hỏng', emoji: '❌' },
};

export function ITAssetDetail({ id }: { id: string }) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'info' | 'assign' | 'return'>('info');
    const [employeeId, setEmployeeId] = useState('');
    const [assignNote, setAssignNote] = useState('');
    const [returnCondition, setReturnCondition] = useState('GOOD');
    const [returnNote, setReturnNote] = useState('');

    const [qrData, setQrData] = useState<{ qrCode: string, url: string } | null>(null);
    const [showingQr, setShowingQr] = useState(false);

    // Fetch Asset
    const { data: asset, isLoading, error } = useQuery({
        queryKey: ['it-asset', id],
        queryFn: () => api.get(`/it-assets/${id}`).then(r => r.data),
    });

    // Fetch employees for assignment
    const { data: employeesData } = useQuery({
        queryKey: ['employees-mini-list'],
        queryFn: () => api.get('/employees', { params: { limit: 1000 } }).then(r => r.data),
    });
    const employees = employeesData?.data || [];

    const handleLoadQr = async () => {
        if (!asset) return;
        setShowingQr(true);
        if (qrData) return;
        try {
            const res = await api.get(`/it-assets/code/${asset.code}/qr`);
            setQrData(res.data);
        } catch (error) {
            console.error('Failed to load QR code', error);
            toast.error("Không tải được mã QR");
        }
    };

    // Assignment Mutations
    const assignMutation = useMutation({
        mutationFn: (data: { id: string; employeeId: string; note: string }) =>
            api.post(`/it-assets/${data.id}/assign`, { employeeId: data.employeeId, note: data.note }),
        onSuccess: () => {
            toast.success("Giao tài sản thành công");
            queryClient.invalidateQueries({ queryKey: ['it-asset', id] });
            queryClient.invalidateQueries({ queryKey: ['it-assets'] });
            setActiveTab('info');
            setEmployeeId('');
            setAssignNote('');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Giao tài sản thất bại");
        }
    });

    const returnMutation = useMutation({
        mutationFn: (data: { id: string; condition: string; note: string }) =>
            api.post(`/it-assets/${data.id}/return`, { condition: data.condition, note: data.note }),
        onSuccess: () => {
            toast.success("Thu hồi tài sản thành công");
            queryClient.invalidateQueries({ queryKey: ['it-asset', id] });
            queryClient.invalidateQueries({ queryKey: ['it-assets'] });
            setActiveTab('info');
            setReturnCondition('GOOD');
            setReturnNote('');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Thu hồi tài sản thất bại");
        }
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-100px)]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!asset || error) {
        return (
            <div className="flex flex-col items-center justify-center p-10 text-center">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Tài sản không tồn tại</h3>
                <p className="text-muted-foreground mt-1">Gặp lỗi trong việc lấy dữ liệu hoặc ID không đúng.</p>
                <Button className="mt-4" onClick={() => router.push('/it-assets')}>Quay lại thiết bị IT</Button>
            </div>
        );
    }

    const statusCfg = STATUS_CONFIG[asset.status] || { label: asset.status, color: 'bg-muted text-muted-foreground' };
    const condCfg = CONDITION_CONFIG[asset.condition] || { label: asset.condition, emoji: '📦' };

    return (
        <div className="space-y-6 max-w-4xl mx-auto w-full pb-10">
            <PageHeader
                title={`Chi tiết: ${asset.name}`}
                description={`Mã TS: ${asset.code}`}
                backHref="/it-assets"
                icon={
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm text-white">
                        <Monitor className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`h-8 px-3 text-sm font-medium border-0 ${statusCfg.color}`}>
                            {statusCfg.label}
                        </Badge>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Info Sidebar */}
                <div className="md:col-span-1 space-y-6">
                    <Card className="rounded-xl border shadow-sm">
                        <CardHeader className="bg-muted/10 pb-3 border-b">
                            <CardTitle className="text-base font-semibold text-foreground flex items-center">
                                <ClipboardList className="w-4 h-4 mr-2" /> Trạng thái
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Tình trạng</Label>
                                <div className="font-medium text-sm border p-2 rounded-md bg-muted/20">
                                    {condCfg.emoji} {condCfg.label}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Người đang sử dụng</Label>
                                <div className="font-medium text-sm text-blue-600 flex items-center p-2 border rounded-md bg-active/5">
                                    {asset.status === 'IN_USE' ? asset.assignedTo?.fullName : 'Trong kho hệ thống'}
                                </div>
                            </div>
                            {asset.department && (
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Phòng ban</Label>
                                    <div className="font-medium text-sm p-2 border rounded-md">
                                        {asset.department.name}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Mã QR</Label>
                                {showingQr ? (
                                    <div className="flex flex-col items-center justify-center p-4 border rounded-md bg-white">
                                        {qrData ? (
                                            <>
                                                <img src={qrData.qrCode} alt="QR" className="w-32 h-32" />
                                                <a href={qrData.url} target="_blank" className="text-[10px] text-blue-500 hover:underline mt-2">Mở link URL</a>
                                            </>
                                        ) : (
                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground my-8" />
                                        )}
                                    </div>
                                ) : (
                                    <Button variant="outline" className="w-full text-xs h-8" onClick={handleLoadQr}>
                                        <QrCode className="w-3 h-3 mr-2" /> Hiện QR Code
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Action Area */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="rounded-xl border shadow-sm h-full">
                        <CardHeader className="bg-muted/10 border-b p-0">
                            <div className="flex">
                                <button
                                    className={`px-6 py-4 text-sm font-medium flex-1 md:flex-none border-b-2 transition-colors ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground hover:bg-muted/50'}`}
                                    onClick={() => setActiveTab('info')}
                                >
                                    Thông tin gốc
                                </button>
                                {asset.status === 'AVAILABLE' && (
                                    <button
                                        className={`px-6 py-4 text-sm font-medium flex-1 md:flex-none border-b-2 transition-colors flex items-center gap-2 justify-center ${activeTab === 'assign' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:bg-muted/50'}`}
                                        onClick={() => setActiveTab('assign')}
                                    >
                                        <UserCheck className="w-4 h-4" /> Giao phần
                                    </button>
                                )}
                                {asset.status === 'IN_USE' && (
                                    <button
                                        className={`px-6 py-4 text-sm font-medium flex-1 md:flex-none border-b-2 transition-colors flex items-center gap-2 justify-center ${activeTab === 'return' ? 'border-red-600 text-red-600' : 'border-transparent text-muted-foreground hover:bg-muted/50'}`}
                                        onClick={() => setActiveTab('return')}
                                    >
                                        <ArrowRight className="w-4 h-4 rotate-180" /> Thu hồi
                                    </button>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="p-6">
                            {/* TAB: INFO */}
                            {activeTab === 'info' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                                        <div className="space-y-1">
                                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tên Thiết Bị</div>
                                            <div className="font-medium pr-4">{asset.name}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Danh mục</div>
                                            <div className="font-medium pr-4">{asset.category?.name || '—'}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Nhãn hiệu (Brand)</div>
                                            <div className="font-medium pr-4">{asset.brand} {asset.model && <span className="text-muted-foreground">({asset.model})</span>}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Series / S.N</div>
                                            <div className="font-mono text-sm pr-4 bg-muted/40 p-1 rounded min-w-[200px] border border-dashed border-muted-foreground/30 inline-block">
                                                {asset.serialNumber || 'Không có'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: ASSIGN */}
                            {activeTab === 'assign' && asset.status === 'AVAILABLE' && (
                                <div className="space-y-6 max-w-lg">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Đang tạo biên bản bàn giao thiết bị <strong>{asset.name}</strong> ({asset.code}) cho nhân viên sử dụng.
                                    </p>

                                    <div className="space-y-3">
                                        <Label required>Nhân viên nhận bàn giao</Label>
                                        <Select onValueChange={setEmployeeId} value={employeeId}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Chọn nhân viên..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map((emp: any) => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.fullName} - <span className="text-muted-foreground">{emp.employeeCode}</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <Label>Ghi chú khi bàn giao</Label>
                                        <Textarea
                                            value={assignNote}
                                            onChange={(e) => setAssignNote(e.target.value)}
                                            placeholder="Tình trạng, phụ kiện đi kèm (chuột, sạc,...), số lượng..."
                                            className="min-h-[120px] resize-none"
                                        />
                                    </div>

                                    <div className="pt-4 border-t flex justify-end gap-3">
                                        <Button variant="outline" onClick={() => setActiveTab('info')}>Hủy</Button>
                                        <Button
                                            disabled={!employeeId || assignMutation.isPending}
                                            onClick={() => assignMutation.mutate({ id, employeeId, note: assignNote })}
                                        >
                                            {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Xác nhận giao
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* TAB: RETURN */}
                            {activeTab === 'return' && asset.status === 'IN_USE' && (
                                <div className="space-y-6 max-w-lg">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Thu hồi thiết bị <strong>{asset.name}</strong> ({asset.code}) từ người dùng <strong>{asset.assignedTo?.fullName}</strong>.
                                    </p>

                                    <div className="space-y-3">
                                        <Label required>Tình trạng thu hồi</Label>
                                        <Select onValueChange={setReturnCondition} value={returnCondition}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Chọn tình trạng..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(CONDITION_CONFIG).map(([key, cfg]) => (
                                                    <SelectItem key={key} value={key}>
                                                        {cfg.emoji} {cfg.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <Label>Ghi chú thu hồi</Label>
                                        <Textarea
                                            value={returnNote}
                                            onChange={(e) => setReturnNote(e.target.value)}
                                            placeholder="Ghi nhận hỏng hóc, thiếu phụ kiện, nguyên nhân thu hồi..."
                                            className="min-h-[120px] resize-none"
                                        />
                                    </div>

                                    <div className="pt-4 border-t flex justify-end gap-3">
                                        <Button variant="outline" onClick={() => setActiveTab('info')}>Hủy</Button>
                                        <Button
                                            variant="destructive"
                                            disabled={returnMutation.isPending}
                                            onClick={() => returnMutation.mutate({ id, condition: returnCondition, note: returnNote })}
                                        >
                                            {returnMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Xác nhận thu hồi
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
