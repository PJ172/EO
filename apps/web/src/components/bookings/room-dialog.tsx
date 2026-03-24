import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateRoom, useUpdateRoom } from '@/hooks/useBookings';
import { toast } from 'sonner';
import { X, Upload, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { uploadApi } from '@/lib/api-client';

interface RoomDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    room?: any; // If provided, edit mode
}

export function RoomDialog({ open, onOpenChange, room }: RoomDialogProps) {
    const isEdit = !!room;
    const createRoom = useCreateRoom();
    const updateRoom = useUpdateRoom();

    // Existing Presets matching backend
    const PRESET_COLORS = [
        '#2563eb', '#059669', '#d97706', '#dc2626',
        '#7c3aed', '#db2777', '#0891b2', '#65a30d'
    ];

    const [name, setName] = useState('');
    const [capacity, setCapacity] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState('');
    const [equipment, setEquipment] = useState<string[]>([]);
    const [features, setFeatures] = useState<string[]>([]);
    const [color, setColor] = useState('');
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
            setColor(room.color || PRESET_COLORS[0]);
        } else {
            // Reset for new room
            setName('');
            setCapacity('');
            setDescription('');
            setImage('');
            setEquipment([]);
            setFeatures([]);
            setColor(PRESET_COLORS[0]);
        }
    }, [room, open]);

    const handleSubmit = () => {
        if (!name || !capacity) {
            toast.error('Vui lòng nhập tên phòng và sức chứa');
            return;
        }

        const roomData = {
            name,
            code: name.toUpperCase().replace(/\s+/g, '_'), // Simple code generation
            capacity: parseInt(capacity),
            description,
            image,
            equipment,
            features,
            color
        };

        if (isEdit) {
            updateRoom.mutate({ id: room.id, data: roomData }, {
                onSuccess: () => {
                    toast.success('Cập nhật phòng thành công');
                    onOpenChange(false);
                },
                onError: (error: any) => {
                    toast.error(error.message || 'Có lỗi xảy ra');
                }
            });
        } else {
            createRoom.mutate(roomData, {
                onSuccess: () => {
                    toast.success('Thêm phòng thành công');
                    onOpenChange(false);
                },
                onError: (error: any) => {
                    toast.error(error.message || 'Có lỗi xảy ra');
                }
            });
        }
    };

    const handleAddEquipment = () => {
        if (newEquipment.trim()) {
            setEquipment([...equipment, newEquipment.trim()]);
            setNewEquipment('');
        }
    };

    const handleRemoveEquipment = (index: number) => {
        setEquipment(equipment.filter((_, i) => i !== index));
    };

    const handleAddFeature = () => {
        if (newFeature.trim()) {
            setFeatures([...features, newFeature.trim()]);
            setNewFeature('');
        }
    };

    const handleRemoveFeature = (index: number) => {
        setFeatures(features.filter((_, i) => i !== index));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn file ảnh');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Kích thước ảnh không được vượt quá 5MB');
            return;
        }

        try {
            setIsUploading(true);
            const response = await uploadApi.upload(file);
            // Assuming response contains the file ID or object with ID
            // Adjust based on your actual API response structure. 
            // If response is the file object:
            const fileId = response.id || response.data?.id;

            if (fileId) {
                const fullUrl = uploadApi.getFileUrl(fileId);
                setImage(fullUrl);
                toast.success('Upload ảnh thành công');
            } else {
                toast.error('Không lấy được ID ảnh sau khi upload');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Upload ảnh thất bại');
        } finally {
            setIsUploading(false);
            // Reset input value to allow selecting same file again
            e.target.value = '';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Cập nhật phòng họp' : 'Thêm phòng họp mới'}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label required>Tên phòng</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Phòng họp A" />
                    </div>

                    <div className="grid gap-2">
                        <Label required>Sức chứa (người)</Label>
                        <Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="20" />
                    </div>

                    <div className="grid gap-2">
                        <Label>Mô tả</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả về phòng..." />
                    </div>

                    <div className="grid gap-3">
                        <Label>Màu đại diện</Label>
                        <div className="flex flex-wrap gap-3">
                            {PRESET_COLORS.map((c) => (
                                <div
                                    key={c}
                                    className={`w-8 h-8 rounded-full cursor-pointer flex items-center justify-center border transition-all ${color === c ? 'ring-2 ring-offset-2 ring-black scale-110' : 'hover:scale-105'}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setColor(c)}
                                >
                                    {color === c && <Check className="text-white w-4 h-4" />}
                                </div>
                            ))}
                            <div className="relative">
                                <Label htmlFor="custom-color" className={`w-8 h-8 rounded-full cursor-pointer flex items-center justify-center border bg-white hover:bg-gray-50 transition-all ${!PRESET_COLORS.includes(color) ? 'ring-2 ring-offset-2 ring-black' : ''}`}>
                                    <span className="text-xs font-medium text-gray-500">+</span>
                                </Label>
                                <Input
                                    id="custom-color"
                                    type="color"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                />
                            </div>
                        </div>
                        {/* Preview if custom */}
                        {!PRESET_COLORS.includes(color) && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: color }}></div>
                                <span>Màu tùy chọn: {color}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label>Hình ảnh phòng họp</Label>

                        {/* Image Preview Area */}
                        <div className="flex flex-col gap-3">
                            {image ? (
                                <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted group">
                                    <img
                                        src={image}
                                        alt="Room Preview"
                                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => setImage('')}
                                            className="h-8"
                                        >
                                            <X className="w-4 h-4 mr-1" /> Xóa ảnh
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="aspect-video w-full rounded-md border border-dashed flex flex-col items-center justify-center bg-muted/30 text-muted-foreground gap-2">
                                    <ImageIcon className="w-8 h-8 opacity-50" />
                                    <span className="text-sm">Chưa có ảnh</span>
                                </div>
                            )}

                            {/* Upload Button */}
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isUploading}
                                    className="w-full relative"
                                    onClick={() => document.getElementById('room-image-upload')?.click()}
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải lên...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mr-2 h-4 w-4" /> Tải ảnh lên
                                        </>
                                    )}
                                </Button>
                                <input
                                    id="room-image-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={isUploading}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground">Hỗ trợ định dạng JPG, PNG, GIF. Tối đa 5MB.</p>
                        </div>
                    </div>

                    {/* Equipment */}
                    <div className="grid gap-2">
                        <Label>Trang thiết bị</Label>
                        <div className="flex gap-2">
                            <Input
                                value={newEquipment}
                                onChange={e => setNewEquipment(e.target.value)}
                                placeholder="Thêm thiết bị (Enter)"
                                onKeyDown={e => e.key === 'Enter' && handleAddEquipment()}
                            />
                            <Button type="button" onClick={handleAddEquipment} variant="secondary">Thêm</Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {equipment.map((item, index) => (
                                <div key={index} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs">
                                    {item}
                                    <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => handleRemoveEquipment(index)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Features */}
                    <div className="grid gap-2">
                        <Label>Đặc điểm nổi bật</Label>
                        <div className="flex gap-2">
                            <Input
                                value={newFeature}
                                onChange={e => setNewFeature(e.target.value)}
                                placeholder="Thêm đặc điểm (Enter)"
                                onKeyDown={e => e.key === 'Enter' && handleAddFeature()}
                            />
                            <Button type="button" onClick={handleAddFeature} variant="secondary">Thêm</Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {features.map((item, index) => (
                                <div key={index} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                    {item}
                                    <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => handleRemoveFeature(index)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                    <Button onClick={handleSubmit}>{isEdit ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
