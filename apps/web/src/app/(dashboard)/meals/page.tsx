'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { UtensilsCrossed, Calendar, Clock, Users, ChefHat, X, Check, AlertCircle, Settings, FileText } from 'lucide-react';
import { apiClient as api } from '@/lib/api-client';
import { usePermissionCheck } from '@/components/auth/permission-gate';
import { toast } from 'sonner';

const SESSION_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
    LUNCH: { label: 'Bữa trưa', emoji: '🍛', color: 'bg-orange-500' },
    AFTERNOON_SNACK: { label: 'Chiều nhẹ', emoji: '🍰', color: 'bg-pink-500' },
    DINNER: { label: 'Bữa tối', emoji: '🍜', color: 'bg-blue-500' },
    LATE_NIGHT_SNACK: { label: 'Khuya nhẹ', emoji: '🥤', color: 'bg-purple-500' },
};

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    REGISTERED: { label: 'Đã đăng ký', variant: 'default' },
    CANCELLED: { label: 'Đã hủy', variant: 'destructive' },
    USED: { label: 'Đã sử dụng', variant: 'secondary' },
};

export default function MealsPage() {
    const { canAny } = usePermissionCheck();
    const isAdmin = canAny(['MEAL_MANAGE']);

    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    // ==========================================
    // SHARED / USER DATA
    // ==========================================
    const { data: sessions = [] } = useQuery({
        queryKey: ['meal-sessions'],
        queryFn: () => api.get('/api/v1/meals/sessions').then((r) => r.data),
    });

    const { data: menu = [] } = useQuery({
        queryKey: ['meal-menu', selectedDate],
        queryFn: () => api.get('/api/v1/meals/menu', { params: { date: selectedDate } }).then((r) => r.data),
    });

    const { data: myRegs = [] } = useQuery({
        queryKey: ['my-meal-registrations', selectedDate],
        queryFn: () => api.get('/api/v1/meals/my-registrations', {
            params: { from: selectedDate, to: selectedDate },
        }).then(r => r.data),
    });

    const registerMutation = useMutation({
        mutationFn: (data: { sessionId: string; date: string }) =>
            api.post('/api/v1/meals/register', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-meal-registrations'] });
            queryClient.invalidateQueries({ queryKey: ['meal-daily-stats'] });
            toast.success('Đăng ký suất ăn thành công');
        },
        onError: () => toast.error('Lỗi khi đăng ký suất ăn'),
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) => api.post(`/api/v1/meals/cancel/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-meal-registrations'] });
            queryClient.invalidateQueries({ queryKey: ['meal-daily-stats'] });
            toast.success('Hủy suất ăn thành công');
        },
        onError: () => toast.error('Lỗi khi hủy đăng ký'),
    });

    // ==========================================
    // ADMIN DATA
    // ==========================================
    const { data: dailyStats } = useQuery({
        queryKey: ['meal-daily-stats', selectedDate],
        queryFn: () => api.get('/api/v1/meals/admin/daily', { params: { date: selectedDate } }).then((r) => r.data),
        enabled: isAdmin,
    });

    const { data: registrations = [] } = useQuery({
        queryKey: ['meal-registrations', selectedDate],
        queryFn: () => api.get('/api/v1/meals/admin/registrations', { params: { date: selectedDate } }).then((r) => r.data),
        enabled: isAdmin,
    });

    const { data: monthlyReport } = useQuery({
        queryKey: ['meal-monthly-report', selectedMonth],
        queryFn: () => api.get('/api/v1/meals/admin/monthly', { params: { month: selectedMonth } }).then((r) => r.data),
        enabled: isAdmin,
    });

    const upsertMenuMutation = useMutation({
        mutationFn: (data: any) => api.post('/api/v1/meals/menu', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meal-menu', selectedDate] });
            toast.success('Đã cập nhật thực đơn');
        },
        onError: () => toast.error('Lỗi khi cập nhật thực đơn'),
    });

    const updateSessionMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/api/v1/meals/sessions/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meal-sessions'] });
            toast.success('Đã cập nhật cấu hình ca ăn');
        },
        onError: () => toast.error('Lỗi khi cập nhật ca ăn'),
    });

    // ==========================================
    // HELPERS
    // ==========================================
    const isRegistered = (sessionId: string) => {
        return myRegs.find((r: any) => r.sessionId === sessionId && r.status === 'REGISTERED');
    };

    const getMenuForSession = (sessionId: string) => {
        return menu.find((m: any) => m.sessionId === sessionId) || {};
    };

    const handleMenuSave = (e: React.FormEvent, sessionId: string) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        upsertMenuMutation.mutate({
            sessionId,
            date: selectedDate,
            mainDish: formData.get('mainDish'),
            sideDish: formData.get('sideDish'),
            soup: formData.get('soup'),
            dessert: formData.get('dessert'),
            price: Number(formData.get('price')) || 0,
            note: formData.get('note')
        });
    };

    const handleSessionSave = (e: React.FormEvent, sessionId: string) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        updateSessionMutation.mutate({
            id: sessionId,
            data: {
                name: formData.get('name'),
                timeStart: formData.get('timeStart'),
                timeEnd: formData.get('timeEnd'),
                cutoffTime: formData.get('cutoffTime'),
                defaultPrice: Number(formData.get('defaultPrice')) || 0,
                isActive: formData.get('isActive') === 'on'
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                        🍽️ Suất ăn nội bộ
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {isAdmin ? 'Đăng ký suất ăn và Quản lý bếp ăn dành cho Admin' : 'Đăng ký suất ăn hàng ngày tại công ty'}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="register" className="space-y-6">
                <div className="overflow-x-auto pb-2">
                    <TabsList className="w-max">
                        {/* User Tabs */}
                        <TabsTrigger value="register" className="flex items-center gap-2">
                            <UtensilsCrossed className="h-4 w-4" /> Đăng ký
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <Clock className="h-4 w-4" /> Lịch sử của tôi
                        </TabsTrigger>

                        {/* Divider if Admin */}
                        {isAdmin && <div className="w-px h-6 bg-border mx-2" />}

                        {/* Admin Tabs */}
                        {isAdmin && (
                            <>
                                <TabsTrigger value="admin-daily-stats" className="flex items-center gap-2 text-indigo-600 data-[state=active]:text-indigo-700">
                                    <AlertCircle className="h-4 w-4" /> Thống kê ngày
                                </TabsTrigger>
                                <TabsTrigger value="admin-menu" className="flex items-center gap-2 text-indigo-600 data-[state=active]:text-indigo-700">
                                    <Settings className="h-4 w-4" /> Thực đơn & Ca ăn
                                </TabsTrigger>
                                <TabsTrigger value="admin-registrations" className="flex items-center gap-2 text-indigo-600 data-[state=active]:text-indigo-700">
                                    <Users className="h-4 w-4" /> DS Đăng ký
                                </TabsTrigger>
                                <TabsTrigger value="admin-monthly" className="flex items-center gap-2 text-indigo-600 data-[state=active]:text-indigo-700">
                                    <FileText className="h-4 w-4" /> Báo cáo tháng
                                </TabsTrigger>
                            </>
                        )}
                    </TabsList>
                </div>

                {/* =========================================
                    USER TABS 
                   ========================================= */}
                <TabsContent value="register" className="space-y-4">
                    <div className="flex items-center gap-3 bg-card p-3 rounded-lg border w-max mb-4">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-40 h-8"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {sessions.length === 0 ? (
                            <div className="col-span-1 md:col-span-2 text-center py-10 bg-muted/20 border rounded-lg border-dashed">
                                <p className="text-muted-foreground">Chưa có Ca ăn nào được thiết lập trong hệ thống.</p>
                                <p className="text-sm text-muted-foreground mt-1">Vui lòng chuyển sang tab <span className="font-medium">Thực đơn & Ca ăn</span> để khởi tạo ca ăn.</p>
                            </div>
                        ) : (
                            sessions.map((session: any) => {
                                const meta = SESSION_LABELS[session.code] || { label: session.name, emoji: '🍽️', color: 'bg-gray-500' };
                                const reg = isRegistered(session.id);
                                const menuItem = getMenuForSession(session.id);

                                return (
                                    <Card key={session.id} className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${reg ? 'ring-2 ring-green-500 bg-green-50/50 dark:bg-green-950/20' : ''
                                        } ${!session.isActive ? 'opacity-50' : ''}`}>
                                        <div className={`absolute top-0 left-0 right-0 h-1 ${meta.color}`} />
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-xl flex items-center gap-2">
                                                    <span className="text-2xl">{meta.emoji}</span>
                                                    {meta.label}
                                                </CardTitle>
                                                {reg && (
                                                    <Badge variant="default" className="bg-green-600">
                                                        <Check className="h-3 w-3 mr-1" /> Đã đăng ký
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardDescription className="flex items-center gap-4">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {session.timeStart} - {session.timeEnd}
                                                </span>
                                                <span className="flex items-center gap-1 text-amber-600">
                                                    <AlertCircle className="h-3.5 w-3.5" />
                                                    Hạn ĐK: {session.cutoffTime}
                                                </span>
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent className="space-y-3">
                                            {menuItem && (menuItem.mainDish || menuItem.sideDish || menuItem.soup || menuItem.dessert) && (
                                                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                                                    <div className="font-medium flex items-center gap-1">
                                                        <ChefHat className="h-3.5 w-3.5" /> Thực đơn:
                                                    </div>
                                                    {menuItem.mainDish && <div>🥘 {menuItem.mainDish}</div>}
                                                    {menuItem.sideDish && <div>🥗 {menuItem.sideDish}</div>}
                                                    {menuItem.soup && <div>🍲 {menuItem.soup}</div>}
                                                    {menuItem.dessert && <div>🍰 {menuItem.dessert}</div>}
                                                </div>
                                            )}
                                            {session.defaultPrice > 0 && (
                                                <div className="text-sm text-muted-foreground">
                                                    💰 {new Intl.NumberFormat('vi-VN').format(session.defaultPrice)} VNĐ
                                                </div>
                                            )}
                                            {session.isActive && (
                                                <div className="pt-2">
                                                    {reg ? (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            className="w-full"
                                                            onClick={() => cancelMutation.mutate(reg.id)}
                                                            disabled={cancelMutation.isPending}
                                                        >
                                                            <X className="h-4 w-4 mr-1" />
                                                            Hủy đăng ký
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            className={`w-full ${meta.color} hover:opacity-90 text-white`}
                                                            onClick={() => registerMutation.mutate({
                                                                sessionId: session.id,
                                                                date: selectedDate,
                                                            })}
                                                            disabled={registerMutation.isPending}
                                                        >
                                                            <UtensilsCrossed className="h-4 w-4 mr-1" />
                                                            Đăng ký
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <div className="flex items-center gap-3 bg-card p-3 rounded-lg border w-max mb-4">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-40 h-8"
                        />
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Lịch sử đăng ký</CardTitle>
                            <CardDescription>Các suất ăn bạn đã đăng ký</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {myRegs.length > 0 ? (
                                <div className="space-y-3">
                                    {myRegs.map((reg: any) => {
                                        const meta = SESSION_LABELS[reg.session?.code] || { label: reg.session?.name, emoji: '🍽️', color: 'bg-gray-500' };
                                        const statusInfo = STATUS_BADGE[reg.status] || { label: reg.status, variant: 'outline' as const };
                                        return (
                                            <div key={reg.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">{meta.emoji}</span>
                                                    <div>
                                                        <div className="font-medium">{meta.label}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {new Date(reg.date).toLocaleDateString('vi-VN')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Chưa có đăng ký nào cho ngày này
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* =========================================
                    ADMIN TABS 
                   ========================================= */}
                {isAdmin && (
                    <>
                        <TabsContent value="admin-daily-stats" className="space-y-4">
                            <div className="flex items-center gap-3 bg-card p-3 rounded-lg border w-max mb-4">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-40 h-8"
                                />
                            </div>
                            {dailyStats ? (
                                <>
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Tổng đăng ký</CardTitle>
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{dailyStats.totalRegistered}</div>
                                                <p className="text-xs text-muted-foreground">suất ăn đã được đăng ký</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Đã sử dụng</CardTitle>
                                                <Check className="h-4 w-4 text-green-500" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{dailyStats.totalUsed}</div>
                                                <p className="text-xs text-muted-foreground">suất ăn đã ăn thực tế</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {dailyStats?.sessions?.map((stat: any) => (
                                            <Card key={stat.session.id}>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-lg flex justify-between">
                                                        <span>{stat.session.name}</span>
                                                        <Badge variant="outline">{stat.total} suất</Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex justify-between items-center text-sm py-1">
                                                        <span className="text-muted-foreground">Đã đăng ký (Chưa ăn)</span>
                                                        <span className="font-medium">{stat.registered}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm py-1 border-t">
                                                        <span className="text-muted-foreground">Đã sử dụng</span>
                                                        <span className="font-medium text-green-600">{stat.used}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm py-1 border-t">
                                                        <span className="text-muted-foreground text-red-500">Đã hủy</span>
                                                        <span className="font-medium text-red-500">{stat.cancelled}</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-10 bg-muted/20 border rounded-lg border-dashed">
                                    <p className="text-muted-foreground">Chưa có số liệu thống kê nào cho ngày được chọn.</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="admin-menu" className="space-y-4">
                            <div className="flex items-center gap-3 bg-card p-3 rounded-lg border w-max mb-4">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-40 h-8"
                                />
                            </div>
                            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
                                {sessions.map((session: any) => {
                                    const meta = SESSION_LABELS[session.code] || { label: session.name, emoji: '🍽️', color: 'bg-gray-500' };
                                    const menuItem = getMenuForSession(session.id);

                                    return (
                                        <Card key={session.id} className="overflow-hidden">
                                            <div className={`h-1 w-full ${meta.color}`} />
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <span>{meta.emoji}</span>
                                                    {session.name} ({session.code})
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                <form onSubmit={(e) => handleMenuSave(e, session.id)} className="space-y-4 border p-4 rounded-lg bg-muted/20">
                                                    <h3 className="font-semibold flex items-center gap-2"><UtensilsCrossed className="h-4 w-4" /> Thực đơn ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}</h3>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Món chính</Label>
                                                            <Input name="mainDish" defaultValue={menuItem.mainDish || ''} placeholder="Ví dụ: Cơm sườn bì chả" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Món phụ</Label>
                                                            <Input name="sideDish" defaultValue={menuItem.sideDish || ''} placeholder="Ví dụ: Trứng ốp la" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Canh</Label>
                                                            <Input name="soup" defaultValue={menuItem.soup || ''} placeholder="Ví dụ: Canh cải nấu thịt" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Tráng miệng</Label>
                                                            <Input name="dessert" defaultValue={menuItem.dessert || ''} placeholder="Ví dụ: Chuối tráng miệng" />
                                                        </div>
                                                    </div>
                                                    <Button type="submit" size="sm" disabled={upsertMenuMutation.isPending}>Lưu Thực Đơn</Button>
                                                </form>

                                                <form onSubmit={(e) => handleSessionSave(e, session.id)} className="space-y-4 border p-4 rounded-lg mt-4">
                                                    <h3 className="font-semibold flex items-center gap-2"><Settings className="h-4 w-4" /> Cấu hình Ca ăn</h3>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Tên ca ăn hiển thị</Label>
                                                            <Input name="name" defaultValue={session.name} required />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Giá tiền mặc định (VNĐ)</Label>
                                                            <Input name="defaultPrice" type="number" defaultValue={session.defaultPrice} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Giờ bắt đầu - kết thúc</Label>
                                                            <div className="flex items-center gap-2">
                                                                <Input name="timeStart" type="time" defaultValue={session.timeStart} required className="w-full" />
                                                                <span>-</span>
                                                                <Input name="timeEnd" type="time" defaultValue={session.timeEnd} required className="w-full" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Giờ chốt đăng ký</Label>
                                                            <Input name="cutoffTime" type="time" defaultValue={session.cutoffTime} required />
                                                        </div>
                                                        <div className="flex items-center justify-between col-span-2 pt-2 border-t">
                                                            <div className="space-y-0.5">
                                                                <Label>Kích hoạt Ca ăn</Label>
                                                                <p className="text-xs text-muted-foreground">Cho phép user đặt suất ăn ca này</p>
                                                            </div>
                                                            <Switch name="isActive" defaultChecked={session.isActive} />
                                                        </div>
                                                    </div>
                                                    <Button type="submit" size="sm" variant="secondary" disabled={updateSessionMutation.isPending}>Lưu Cấu Hình</Button>
                                                </form>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </TabsContent>

                        <TabsContent value="admin-registrations">
                            <div className="flex items-center gap-3 bg-card p-3 rounded-lg border w-max mb-4">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-40 h-8"
                                />
                            </div>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Danh sách đăng ký chi tiết</CardTitle>
                                    <CardDescription>Danh sách nhân viên ghi nhận xuất ăn</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                                            <TableRow>
                                                <TableHead>Mã nhân viên</TableHead>
                                                <TableHead>Họ và tên</TableHead>
                                                <TableHead>Phòng ban</TableHead>
                                                <TableHead>Ca ăn</TableHead>
                                                <TableHead>Trạng thái</TableHead>
                                                <TableHead>Ghi chú</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {registrations.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                                        Chưa có đăng ký nào.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {registrations.map((reg: any) => {
                                                const statusInfo = STATUS_BADGE[reg.status] || { label: reg.status, variant: 'outline' as const };
                                                return (
                                                    <TableRow key={reg.id}>
                                                        <TableCell className="font-medium">{reg.employee.employeeCode}</TableCell>
                                                        <TableCell>{reg.employee.fullName}</TableCell>
                                                        <TableCell>{reg.employee.department?.name || '-'}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{reg.session.name}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                                                        </TableCell>
                                                        <TableCell>{reg.note || '-'}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="admin-monthly" className="space-y-4">
                            <div className="flex items-center gap-3 bg-card p-3 rounded-lg border w-max mb-4">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-40 h-8"
                                />
                            </div>

                            {monthlyReport ? (
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Card className="md:col-span-3 lg:col-span-1">
                                        <CardHeader>
                                            <CardTitle className="text-lg">Tổng quan tháng</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="text-3xl font-bold">{monthlyReport.totalRegistrations}</div>
                                            <p className="text-sm text-muted-foreground mb-4">tổng suất ăn đã đăng ký và sử dụng</p>

                                            <div className="space-y-2">
                                                <h4 className="text-sm font-semibold mb-2">Phân bổ theo ca</h4>
                                                {monthlyReport.bySession.map((s: any) => (
                                                    <div key={s.code} className="flex justify-between text-sm">
                                                        <span>{s.name}</span>
                                                        <span className="font-medium">{s.count} suất</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="md:col-span-3 lg:col-span-2">
                                        <CardHeader>
                                            <CardTitle className="text-lg">Theo phòng ban</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                                                    <TableRow>
                                                        <TableHead>Phòng ban</TableHead>
                                                        <TableHead className="text-right">Số suất ăn</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {monthlyReport.byDepartment.map((dept: any) => (
                                                        <TableRow key={dept.departmentName}>
                                                            <TableCell>{dept.departmentName}</TableCell>
                                                            <TableCell className="text-right font-medium">{dept.count}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-muted/20 border rounded-lg border-dashed">
                                    <p className="text-muted-foreground">Chưa có số liệu báo cáo nào cho tháng được chọn.</p>
                                </div>
                            )}
                        </TabsContent>
                    </>
                )
                }
            </Tabs >
        </div >
    );
}
