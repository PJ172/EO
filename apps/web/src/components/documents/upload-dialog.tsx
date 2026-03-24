'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useUploadFile, useCreateDocument } from '@/services/documents.service';
import { toast } from 'sonner';

const formSchema = z.object({
    title: z.string().min(2, {
        message: 'Title must be at least 2 characters.',
    }),
    type: z.enum(['POLICY', 'PROCESS']),
    category: z.string().optional(),
});

export function UploadDialog() {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const uploadFileMutation = useUploadFile();
    const createDocumentMutation = useCreateDocument();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            type: 'POLICY',
            category: '',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!file) {
            toast.error('Please select a file');
            return;
        }

        try {
            // 1. Upload File
            toast.info('Uploading file...');
            const uploadRes = await uploadFileMutation.mutateAsync(file);

            // 2. Create Document
            toast.info('Creating document...');
            await createDocumentMutation.mutateAsync({
                ...values,
                fileId: uploadRes.id,
                content: 'Initial upload', // Placeholder content extraction
                tags: [],
            });

            toast.success('Document created successfully');
            setOpen(false);
            form.reset();
            setFile(null);
        } catch (error) {
            console.error(error);
            toast.error('Failed to create document');
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Tải lên tài liệu</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Tải lên tài liệu mới</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tiêu đề</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nhập tiêu đề tài liệu" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Loại tài liệu</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Chọn loại tài liệu" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="POLICY">Chính sách</SelectItem>
                                            <SelectItem value="PROCESS">Quy trình</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormItem>
                            <FormLabel>Tệp đính kèm</FormLabel>
                            <FormControl>
                                <Input
                                    type="file"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setFile(file);
                                    }}
                                />
                            </FormControl>
                        </FormItem>

                        <Button type="submit" disabled={uploadFileMutation.isPending || createDocumentMutation.isPending}>
                            {uploadFileMutation.isPending || createDocumentMutation.isPending ? 'Đang xử lý...' : 'Tải lên'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
