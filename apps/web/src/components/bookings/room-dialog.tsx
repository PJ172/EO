"use client";

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateRoom, useUpdateRoom } from '@/hooks/useBookings';
import { toast } from 'sonner';
import { X, Upload, Loader2, Monitor, Check, Users, Sparkles, Package, Star, Maximize2 } from 'lucide-react';
import { uploadApi } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface RoomDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    room?: any;
}

const PRESET_COLORS = [
    { value: '#2563eb', name: 'Xanh dương' },
    { value: '#059669', name: 'Xanh lá' },
    { value: '#d97706', name: 'Cam' },
    { value: '#dc2626', name: 'Đỏ' },
    { value: '#0d9488', name: 'Teal' },
    { value: '#db2777', name: 'Hồng' },
    { value: '#0891b2', name: 'Cyan' },
    { value: '#65a30d', name: 'Lime' },
    { value: '#ea580c', name: 'Cam đậm' },
];

export function RoomDialog({ open, onOpenChange, room }: RoomDialogProps) {
    const isEdit = !!room;
    const createRoom = useCreateRoom();
    const updateRoom = useUpdateRoom();

    const [name, setName] = useState('');
    const [capacity, setCapacity] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState('');
    const [equipment, setEquipment] = useState<string[]>([]);
    const [features, setFeatures] = useState<string[]>([]);
    const [color, setColor] = useState('#2563eb');
    const [newEquipment, setNewEquipment] = useState('');
    const [newFeature, setNewFeature] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (room) {
            setName(room.name || '');
            setCapacity(room.capacity?.toString() || '');
            setDescription(room.description || '');
            setImage(room.image || '');
            setEquipment(room.equipment || []);
            setFeatures(room.features || []);
            setColor(room.color || '#2563eb');
        } else {
            setName(''); setCapacity(''); setDescription(''); setImage('');
            setEquipment([]); setFeatures([]); setColor('#2563eb');
        }
    }, [room, open]);

    const handleSubmit = () => {
        if (!name || !capacity) {
            toast.error('Vui lòng nhập tên phòng và sức chứa');
            return;
        }
        const roomData = {
            name, code: name.toUpperCase().replace(/\s+/g, '_'),
            capacity: parseInt(capacity), description, image, equipment, features, color
        };
        const mutation = isEdit
            ? () => updateRoom.mutate({ id: room.id, data: roomData }, {
                onSuccess: () => { toast.success('Cập nhật phòng thành công'); onOpenChange(false); },
                onError: (e: any) => toast.error(e.message || 'Có lỗi xảy ra')
            })
            : () => createRoom.mutate(roomData, {
                onSuccess: () => { toast.success('Thêm phòng thành công'); onOpenChange(false); },
                onError: (e: any) => toast.error(e.message || 'Có lỗi xảy ra')
            });
        mutation();
    };

    const handleAddEquipment = () => {
        if (newEquipment.trim()) { setEquipment([...equipment, newEquipment.trim()]); setNewEquipment(''); }
    };
    const handleAddFeature = () => {
        if (newFeature.trim()) { setFeatures([...features, newFeature.trim()]); setNewFeature(''); }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Vui lòng chọn file ảnh'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('Kích thước ảnh tối đa 5MB'); return; }
        try {
            setIsUploading(true);
            const oldFileId = image ? image.split('/').pop() : undefined;
            const response = await uploadApi.upload(file, 'meeting', oldFileId);
            const fileId = response.id || response.data?.id;
            if (fileId) { 
                setImage(uploadApi.getFileUrl(fileId)); 
                toast.success('Upload thành công'); 
            }
            else { toast.error('Không lấy được ID ảnh'); }
        } catch { toast.error('Upload thất bại'); }
        finally { setIsUploading(false); e.target.value = ''; }
    };

    const isSubmitting = createRoom.isPending || updateRoom.isPending;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:w-[50vw] sm:max-w-[50vw] p-0 flex flex-col gap-0 border-l shadow-2xl">
                {/* Header — compact */}
                <div className="px-6 py-5 border-b bg-slate-50/80 dark:bg-slate-900/50 shrink-0">
                    <SheetHeader>
                        <SheetTitle className="text-xl font-bold flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: color }}>
                                <Monitor className="h-5 w-5" />
                            </div>
                            {isEdit ? 'Chỉnh sửa phòng họp' : 'Thêm phòng họp mới'}
                        </SheetTitle>
                    </SheetHeader>
                </div>

                {/* Scrollable body — single column, wide */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-white dark:bg-slate-950">

                    {/* Row 1: Name + Capacity inline */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-2 space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tên phòng <span className="text-red-500">*</span></Label>
                            <Input
                                value={name} onChange={e => setName(e.target.value)}
                                placeholder="VD: Phòng họp Đà Nẵng"
                                className="h-12 text-base shadow-sm"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sức chứa <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="number" value={capacity} onChange={e => setCapacity(e.target.value)}
                                    placeholder="20" className="h-12 pl-10 text-base shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Color picker inline */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Màu đại diện</Label>
                        <div className="flex items-center gap-2">
                            {PRESET_COLORS.map((c) => (
                                <button
                                    key={c.value} type="button" title={c.name}
                                    className={cn(
                                        "h-8 w-8 rounded-md flex items-center justify-center transition-all duration-200 border-2 cursor-pointer shadow-sm",
                                        color === c.value ? "border-slate-800 dark:border-white scale-110 shadow-md ring-2 ring-primary/20 ring-offset-2" : "border-transparent hover:scale-110 hover:shadow"
                                    )}
                                    style={{ backgroundColor: c.value }}
                                    onClick={() => setColor(c.value)}
                                >
                                    {color === c.value && <Check className="text-white h-4 w-4 drop-shadow-md" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Row 3: Description */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mô tả chi tiết</Label>
                        <Textarea
                            value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Mô tả các tiện ích, mục đích sử dụng của phòng họp..." rows={3}
                            className="text-base resize-none shadow-sm"
                        />
                    </div>

                    {/* Row 4: Image — inline compact */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hình ảnh phòng họp</Label>
                        {image ? (
                            <div className="relative h-48 sm:h-64 rounded-xl overflow-hidden border shadow-sm group bg-slate-100">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <div className="w-full h-full cursor-pointer relative group">
                                            <img src={image} alt="Room" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 bg-black/60 text-white rounded-full p-2 backdrop-blur-sm transition-all transform scale-90 group-hover:scale-100">
                                                    <Maximize2 className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-[90vw] md:max-w-5xl p-1 bg-transparent border-none shadow-none">
                                        <img src={image} alt="Room Fullsize" className="w-full h-auto max-h-[85vh] object-contain rounded-xl" />
                                    </DialogContent>
                                </Dialog>
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button type="button" variant="destructive" size="sm" onClick={() => setImage('')} className="h-8 shadow-lg">
                                        <X className="w-4 h-4 mr-1.5" /> Xóa ảnh
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <label className="block cursor-pointer">
                                <div className={cn(
                                    "h-48 sm:h-64 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all shadow-sm",
                                    isUploading
                                        ? "border-blue-400 bg-blue-50/50"
                                        : "border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 dark:border-slate-700 bg-slate-50/50"
                                )}>
                                    {isUploading ? (
                                        <><Loader2 className="h-8 w-8 animate-spin text-blue-500" /><span className="text-sm text-blue-600 font-medium">Đang tải ảnh lên...</span></>
                                    ) : (
                                        <>
                                            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
                                                <Upload className="h-6 w-6" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm text-slate-700 font-medium mb-1">Nhấn để chọn hoặc kéo thả ảnh vào đây</p>
                                                <p className="text-xs text-muted-foreground">Chỉ hỗ trợ file JPG, PNG. Kích thước tối đa 5MB</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                            </label>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-t pt-6" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Row 5: Equipment */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-5 w-1.5 rounded-full bg-emerald-500" />
                                <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Trang thiết bị</Label>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={newEquipment} onChange={e => setNewEquipment(e.target.value)}
                                    placeholder="VD: Màn hình LED 65 inch"
                                    className="h-10 text-sm flex-1 shadow-sm"
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddEquipment())}
                                />
                                <Button type="button" onClick={handleAddEquipment} variant="secondary" className="h-10 px-4 shrink-0 text-sm cursor-pointer shadow-sm">
                                    <Package className="h-4 w-4 mr-1.5" /> Thêm
                                </Button>
                            </div>
                            {equipment.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                                    {equipment.map((item, i) => (
                                        <span key={i} className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1.5 rounded-md text-xs font-semibold border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                            <Monitor className="h-3 w-3" />{item}
                                            <button onClick={() => setEquipment(equipment.filter((_, idx) => idx !== i))} className="ml-1 hover:text-red-500 hover:bg-emerald-100 rounded p-0.5 transition-colors cursor-pointer">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Row 6: Features */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-5 w-1.5 rounded-full bg-amber-500" />
                                <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Đặc điểm nổi bật</Label>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={newFeature} onChange={e => setNewFeature(e.target.value)}
                                    placeholder="VD: Cách âm tốt, View biển"
                                    className="h-10 text-sm flex-1 shadow-sm"
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                                />
                                <Button type="button" onClick={handleAddFeature} variant="secondary" className="h-10 px-4 shrink-0 text-sm cursor-pointer shadow-sm">
                                    <Star className="h-4 w-4 mr-1.5" /> Thêm
                                </Button>
                            </div>
                            {features.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                                    {features.map((item, i) => (
                                        <span key={i} className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-2.5 py-1.5 rounded-md text-xs font-semibold border border-amber-200 dark:border-amber-800 shadow-sm">
                                            <Sparkles className="h-3 w-3" />{item}
                                            <button onClick={() => setFeatures(features.filter((_, idx) => idx !== i))} className="ml-1 hover:text-red-500 hover:bg-amber-100 rounded p-0.5 transition-colors cursor-pointer">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer — sticky bottom, no gap */}
                <div className="px-6 py-4 border-t bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <p className="text-xs text-muted-foreground font-medium">
                        {isEdit ? 'Thay đổi sẽ được cập nhật ngay vào hệ thống' : 'Phòng mới sẽ xuất hiện trên màn hình quản lý lịch'}
                    </p>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-6 font-semibold cursor-pointer">Đóng</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="h-10 px-8 font-semibold shadow-md cursor-pointer transition-transform active:scale-95 text-white hover:brightness-110" style={{ backgroundColor: color }}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {isEdit ? 'Lưu thay đổi' : 'Tạo phòng họp'}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
