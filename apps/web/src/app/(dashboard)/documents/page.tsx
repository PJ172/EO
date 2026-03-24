"use client";

import { DocumentList } from '@/components/documents/document-list';
import { UploadDialog } from '@/components/documents/upload-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileDown, Upload, FileText } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SearchBar } from "@/components/ui/search-bar";
import { toast } from "sonner";


export default function DocumentsPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);


    const handleRefresh = async () => {
        setIsRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ["documents"] });
        setIsRefreshing(false);
    };

    const handleExport = () => toast.info("Tính năng Xuất Excel đang được phát triển...");
    const handleImport = () => toast.info("Tính năng Nhập Excel đang được phát triển...");

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-4 p-2 bg-background animate-in fade-in duration-500">
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2">
            <PageHeader
                title="Tài liệu"
                icon={
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-purple-500 to-purple-700">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" style={{ margin: '2px' }} />
                    </div>
                }
                className="mb-0 border-none bg-transparent p-0 shadow-none"
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                search={
                    <SearchBar
                        placeholder="Tìm kiếm tài liệu..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                }
            >
                <Button variant="outline" onClick={handleExport} className="h-10">
                    <FileDown className="mr-2 h-4 w-4" /> Xuất Excel
                </Button>
                <Button variant="outline" onClick={handleImport} className="h-10">
                    <Upload className="mr-2 h-4 w-4" /> Nhập Excel
                </Button>
                <UploadDialog />
            </PageHeader>
            </div>
            
            <div className="flex-1 overflow-hidden min-h-0 rounded-md border bg-card p-0 flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                <DocumentList search={search} isDeletedView={false} />
                </div>
            </div>
        </div>
    );
}
