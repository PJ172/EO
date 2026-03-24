'use client';

import { useParams } from 'next/navigation';
import { useDocument, useDocumentWorkflow } from '@/services/documents.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, XCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { data: doc, isLoading, error } = useDocument(id);
    const { submit, approve, reject } = useDocumentWorkflow();

    const handleAction = async (action: 'submit' | 'approve' | 'reject') => {
        try {
            if (action === 'submit') {
                await submit.mutateAsync(id);
                toast.success('Đã gửi tài liệu');
            } else if (action === 'approve') {
                await approve.mutateAsync(id);
                toast.success('Đã duyệt tài liệu');
            } else if (action === 'reject') {
                await reject.mutateAsync(id);
                toast.success('Đã từ chối tài liệu');
            }
        } catch (err) {
            console.error(err);
            toast.error('Thao tác thất bại');
        }
    };

    if (isLoading) return <div>Đang tải...</div>;
    if (error || !doc) return <div>Không tìm thấy tài liệu</div>;

    return (
        <div className="flex flex-col gap-6 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{doc.title}</h2>
                    <p className="text-muted-foreground">{doc.category || 'Chưa phân loại'}</p>
                </div>
                <div className="flex gap-2">
                    <Badge>{doc.type}</Badge>
                    <Badge variant="outline">{doc.status}</Badge>

                    {doc.status === 'DRAFT' && (
                        <Button size="sm" onClick={() => handleAction('submit')} disabled={submit.isPending}>
                            <Send className="mr-2 h-4 w-4" /> Gửi duyệt
                        </Button>
                    )}
                    {doc.status === 'SUBMITTED' && (
                        <>
                            <Button size="sm" variant="default" onClick={() => handleAction('approve')} disabled={approve.isPending} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" /> Duyệt
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleAction('reject')} disabled={reject.isPending}>
                                <XCircle className="mr-2 h-4 w-4" /> Từ chối
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Thông tin</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="font-semibold">Ngày tạo:</span>
                            <span>{format(new Date(doc.createdAt), 'dd/MM/yyyy', { locale: vi })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Cập nhật lần cuối:</span>
                            <span>{format(new Date(doc.updatedAt), 'dd/MM/yyyy', { locale: vi })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Phiên bản hiện tại:</span>
                            <span>{doc.currentVersionId ? 'Có' : 'Chưa có'}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Phiên bản</CardTitle>
                        <CardDescription>Lịch sử các phiên bản đã tải lên</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                                <TableRow>
                                    <TableHead>Phiên bản</TableHead>
                                    <TableHead>Ngày tạo</TableHead>
                                    <TableHead className="text-right">Tài liệu</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {doc.versions?.map((v) => (
                                    <TableRow key={v.id}>
                                        <TableCell>v{v.versionNo}</TableCell>
                                        <TableCell>{format(new Date(v.createdAt), 'dd/MM/yyyy', { locale: vi })}</TableCell>
                                        <TableCell className="text-right">
                                            {v.fileId && (
                                                <Button variant="ghost" size="icon" asChild>
                                                    <a href={`http://localhost:3000/api/files/${v.fileId}`} target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
