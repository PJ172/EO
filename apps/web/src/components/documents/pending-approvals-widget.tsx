'use client';

import { useDocuments } from '@/services/documents.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export function PendingApprovalsWidget() {
    const { data: documents, isLoading } = useDocuments();

    // In real app, this should be filtered by API for efficiency
    const pendingDocs = documents?.filter(d => d.status === 'SUBMITTED') || [];

    if (isLoading) return <Card className="col-span-3 h-[350px] animate-pulse bg-muted/50" />;

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Tài liệu chờ duyệt ({pendingDocs.length})</span>
                    <Button variant="link" size="sm" asChild>
                        <Link href="/iso/documents">Xem tất cả <ArrowRight className="ml-1 h-4 w-4" /></Link>
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {pendingDocs.slice(0, 5).map(doc => (
                        <div key={doc.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">{doc.title}</p>
                                    <p className="text-xs text-muted-foreground">{doc.type} • {format(new Date(doc.createdAt), 'dd/MM/yyyy')}</p>
                                </div>
                            </div>
                            <Button size="sm" variant="outline" asChild>
                                <Link href={`/documents/${doc.id}`}>Duyệt</Link>
                            </Button>
                        </div>
                    ))}
                    {pendingDocs.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <p>Không có tài liệu nào cần duyệt.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
