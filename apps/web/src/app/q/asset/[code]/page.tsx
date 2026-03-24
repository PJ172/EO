'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Package, UserCheck, Wrench, Shield, AlertTriangle } from 'lucide-react';
import { apiClient as api } from '@/lib/api-client';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    AVAILABLE: { label: 'Sẵn sàng', color: 'bg-green-100 text-green-800', icon: Shield },
    IN_USE: { label: 'Đang sử dụng', color: 'bg-blue-100 text-blue-800', icon: UserCheck },
    MAINTENANCE: { label: 'Bảo trì', color: 'bg-yellow-100 text-yellow-800', icon: Wrench },
    RETIRED: { label: 'Thanh lý', color: 'bg-gray-100 text-gray-800', icon: Package },
    LOST: { label: 'Mất', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

export default function MobileAssetPage() {
    const params = useParams();
    const router = useRouter();
    const code = params.code as string;

    const { data: asset, isLoading, error } = useQuery({
        queryKey: ['asset-detail', code],
        queryFn: async () => {
            // Let's use the search query param on the list endpoint to find it by code.
            const res = await api.get('/it-assets', { params: { search: code, limit: 1 } });
            if (res.data.data.length > 0) {
                // To get full details (assignments, etc) we call the ID endpoint
                const idRes = await api.get(`/it-assets/${res.data.data[0].id}`);
                return idRes.data;
            }
            throw new Error('Asset not found');
        },
        retry: 1
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-zinc-950">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-muted-foreground">Đang tải thông tin tài sản...</p>
                </div>
            </div>
        );
    }

    if (error || !asset) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-zinc-950 text-center">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Không tìm thấy tài sản</h2>
                <p className="text-muted-foreground mb-6">Mã QR không hợp lệ hoặc tài sản đã bị xóa khỏi hệ thống.</p>
                <Button onClick={() => router.push('/dashboard')}>Về trang chủ</Button>
            </div>
        );
    }

    const StatCfg = STATUS_CONFIG[asset.status] || { label: asset.status, color: 'bg-gray-100', icon: Package };
    const StatusIcon = StatCfg.icon;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-12">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 sticky top-0 z-10 shadow-md">
                <div className="flex items-center gap-3 max-w-md mx-auto">
                    <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-white/20 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="font-semibold text-lg leading-tight">Chi tiết Tài sản</h1>
                        <p className="text-blue-100 text-xs font-mono">{asset.code}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-4 mt-2">
                {/* Main Info Card */}
                <Card className="overflow-hidden border-none shadow-md">
                    <div className="bg-white dark:bg-zinc-900 p-6 flex flex-col items-center text-center border-b">
                        <div className={`p-4 rounded-full mb-4 ${StatCfg.color} bg-opacity-20`}>
                            <StatusIcon className={`w-10 h-10`} />
                        </div>
                        <h2 className="text-2xl font-bold mb-1">{asset.name}</h2>
                        <p className="text-muted-foreground mb-4">{asset.category?.name}</p>
                        <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${StatCfg.color}`}>
                            {StatCfg.label}
                        </span>
                    </div>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            <div className="p-4 flex justify-between items-center bg-white dark:bg-zinc-900">
                                <span className="text-muted-foreground text-sm">Nhãn hiệu</span>
                                <span className="font-medium">{asset.brand || '—'} {asset.model || ''}</span>
                            </div>
                            <div className="p-4 flex justify-between items-center bg-white dark:bg-zinc-900">
                                <span className="text-muted-foreground text-sm">Số Serial</span>
                                <span className="font-mono text-sm">{asset.serialNumber || '—'}</span>
                            </div>
                            <div className="p-4 flex justify-between items-center bg-white dark:bg-zinc-900">
                                <span className="text-muted-foreground text-sm">Ngày mua</span>
                                <span className="font-medium">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('vi-VN') : '—'}</span>
                            </div>
                            <div className="p-4 flex justify-between items-center bg-white dark:bg-zinc-900">
                                <span className="text-muted-foreground text-sm">Hết hạn BH</span>
                                <span className="font-medium">{asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString('vi-VN') : '—'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Assignment Info */}
                <Card className="shadow-sm border-none">
                    <CardHeader className="py-4 border-b bg-gray-50/50 dark:bg-zinc-900/50">
                        <CardTitle className="text-base flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-blue-500" />
                            {asset.status === 'IN_USE' ? 'Thông tin sử dụng' : 'Khả dụng'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        {asset.status === 'IN_USE' ? (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Người đang giữ</p>
                                    <p className="font-semibold text-lg">{asset.assignedTo?.fullName || 'Không xác định'}</p>
                                    {asset.assignedTo?.department && (
                                        <p className="text-sm text-muted-foreground">{asset.assignedTo.department.name}</p>
                                    )}
                                </div>
                                {asset.assignments?.[0] && (
                                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg mt-3">
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Ngày giao: {new Date(asset.assignments[0].assignedDate).toLocaleDateString('vi-VN')}</p>
                                        {asset.assignments[0].note && (
                                            <p className="text-sm italic text-muted-foreground mt-1">"{asset.assignments[0].note}"</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-green-600 font-medium">Tài sản này đang ở kho và sẵn sàng để cấp phát.</p>
                                {asset.location && <p className="text-sm text-muted-foreground mt-1">Vị trí: {asset.location}</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Note / Specs */}
                {(asset.specifications || asset.note) && (
                    <Card className="shadow-sm border-none">
                        <CardHeader className="py-4 border-b bg-gray-50/50 dark:bg-zinc-900/50">
                            <CardTitle className="text-base">Thông số & Ghi chú</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4 text-sm">
                            {asset.specifications && (
                                <div>
                                    <p className="font-medium mb-1">Cấu hình / Thông số:</p>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{asset.specifications}</p>
                                </div>
                            )}
                            {asset.note && (
                                <div>
                                    <p className="font-medium mb-1">Ghi chú:</p>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{asset.note}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
