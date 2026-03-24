"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { AuditLogParams } from "@/services/audit.service";
import { useEmployees } from "@/services/employee.service";

interface AuditFilterProps {
    onFilterChange: (filters: AuditLogParams) => void;
}

export function AuditFilter({ onFilterChange }: AuditFilterProps) {
    const [action, setAction] = useState<string>("all");
    const [entityType, setEntityType] = useState<string>("all");
    const [date, setDate] = useState<string>("");

    // We can add user filter later if needed, simpler for now

    const handleFilter = () => {
        const filters: AuditLogParams = {
            page: 1, // Reset to page 1 on filter
        };

        if (action && action !== "all") filters.action = action;
        if (entityType && entityType !== "all") filters.entityType = entityType;
        // Date filtering logic can be added here

        onFilterChange(filters);
    };

    const handleReset = () => {
        setAction("all");
        setEntityType("all");
        setDate("");
        onFilterChange({ page: 1 });
    };

    return (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-4 bg-muted/30 rounded-lg border">
            <div className="w-[200px]">
                <Select value={action} onValueChange={setAction}>
                    <SelectTrigger>
                        <SelectValue placeholder="Hành động" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả hành động</SelectItem>
                        <SelectItem value="CREATE">Tạo mới (Create)</SelectItem>
                        <SelectItem value="UPDATE">Cập nhật (Update)</SelectItem>
                        <SelectItem value="DELETE">Xóa (Delete)</SelectItem>
                        <SelectItem value="LOGIN">Đăng nhập</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="w-[200px]">
                <Select value={entityType} onValueChange={setEntityType}>
                    <SelectTrigger>
                        <SelectValue placeholder="Loại đối tượng" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả đối tượng</SelectItem>
                        <SelectItem value="Department">Phòng ban</SelectItem>
                        <SelectItem value="Employee">Nhân viên</SelectItem>
                        <SelectItem value="Project">Dự án</SelectItem>
                        <SelectItem value="User">Tài khoản</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button variant="default" onClick={handleFilter}>
                <Search className="mr-2 h-4 w-4" /> Lọc
            </Button>
            <Button variant="ghost" onClick={handleReset}>
                <X className="mr-2 h-4 w-4" /> Xóa bộ lọc
            </Button>
        </div>
    );
}
