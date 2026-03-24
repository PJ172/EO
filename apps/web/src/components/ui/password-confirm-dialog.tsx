"use client";

import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, XCircle, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface PasswordConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    onConfirm: () => void;
    isLoading?: boolean;
}

export function PasswordConfirmDialog({
    open,
    onOpenChange,
    title = "Xác thực bảo mật",
    description = "Thao tác này yêu cầu quyền quản trị viên. Vui lòng nhập mật khẩu của bạn để tiếp tục.",
    onConfirm,
    isLoading = false,
}: PasswordConfirmDialogProps) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isValidating, setIsValidating] = useState(false);

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setPassword("");
            setError("");
        }
        onOpenChange(newOpen);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) {
            setError("Vui lòng nhập mật khẩu");
            return;
        }

        setIsValidating(true);
        setError("");

        try {
            const response = await authApi.verifyPassword(password);
            if (response.valid) {
                onConfirm();
                handleOpenChange(false);
            } else {
                setError("Mật khẩu không chính xác");
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || "Lỗi xác minh mật khẩu");
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent
                side="right"
                showCloseButton={false}
                className="!w-[min(96vw,500px)] !max-w-none p-0 flex flex-col gap-0 overflow-hidden bg-background"
            >
                {/* Header Gradient */}
                <div className="bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 px-6 py-4 flex items-center gap-3 shrink-0 shadow-sm z-10">
                    <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                        <Lock className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-white text-lg font-semibold border-none m-0 p-0 leading-tight">{title}</h2>
                        <p className="text-white/90 text-xs mt-0.5 m-0 p-0 line-clamp-2">{description}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/25 transition-colors shrink-0 text-white"
                        title="Đóng"
                    >
                        <XCircle className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-6 pt-6 flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-full">

                        <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl p-4 flex items-start gap-3 text-sm text-rose-800 dark:text-rose-300">
                            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                            <div className="leading-relaxed">
                                <span className="font-semibold block mb-1">Cảnh báo hành động nhạy cảm</span>
                                Bạn đang thực hiện một hành động có thể gây mất dữ liệu vĩnh viễn hệ thống. Xin hãy cẩn trọng!
                            </div>
                        </div>

                        {error && (
                            <Alert variant="destructive" className="py-2.5 px-3 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <AlertDescription className="ml-2 text-sm font-medium text-red-800 dark:text-red-300">{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-3 flex-1">
                            <Label htmlFor="passwordConfirm" className="text-sm font-semibold text-foreground">Mật khẩu quản trị viên</Label>
                            <Input
                                id="passwordConfirm"
                                type="password"
                                autoFocus
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Nhập mật khẩu..."
                                disabled={isValidating || isLoading}
                                className={cn(
                                    "h-12 text-lg px-4 bg-muted/30 transition-colors",
                                    error ? "border-red-500 focus-visible:ring-red-500 bg-red-50 dark:bg-red-950/20" : "focus-visible:ring-rose-500/50 focus-visible:border-rose-500"
                                )}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-6 mt-auto border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={isValidating || isLoading}
                                className="px-6 h-10 font-medium"
                            >
                                Hủy thao tác
                            </Button>
                            <Button
                                type="submit"
                                disabled={!password || isValidating || isLoading}
                                className="h-10 px-8 font-semibold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md hover:shadow-lg transition-all"
                            >
                                {isValidating ? "Đang xác thực..." : "Xác nhận & Tiếp tục"}
                            </Button>
                        </div>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    );
}
