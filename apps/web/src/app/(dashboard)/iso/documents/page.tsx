"use client";

import { DocumentList } from '@/components/documents/document-list';
import { UploadDialog } from '@/components/documents/upload-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileDown, Upload, FileText, Settings2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
                title="TÀI LIỆU ISO"
                titleClassName="from-green-600 to-emerald-700 dark:from-green-400 dark:to-emerald-400"
                icon={
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-green-500 to-emerald-700">
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
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-10 gap-2">
                            <Settings2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm">Tùy chọn</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px] border-border shadow-lg rounded-xl">
                        <DropdownMenuItem onClick={handleExport} className="py-2.5 cursor-pointer rounded-lg mx-1">
                            <FileDown className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-medium">Xuất dữ liệu Excel</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleImport} className="py-2.5 cursor-pointer rounded-lg mx-1">
                            <Upload className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium">Nhập dữ liệu Excel</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
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
