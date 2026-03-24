"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import { Building2, Eye, EyeOff, Loader2 } from "lucide-react";
import { loginSchema, LoginFormData } from "@/lib/validations";
import { useLogin } from "@/services/auth.service";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showPassword, setShowPassword] = useState(false);
    const loginMutation = useLogin();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            const res = await loginMutation.mutateAsync({
                username: data.username,
                password: data.password,
            });

            // Fallback lưu cứng Token vào client Storage để ngăn tình trạng ReactQuery bị hủy vòng đời do Reload gấp.
            if (res && res.accessToken) {
                localStorage.setItem("accessToken", res.accessToken);
                if (res.refreshToken) {
                    localStorage.setItem("refreshToken", res.refreshToken);
                }
                // Đồng bộ Cookie trực tiếp
                document.cookie = `accessToken=${res.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
            }

            toast.success("Đăng nhập thành công!", {
                description: "Chào mừng bạn quay trở lại",
            });

            const redirect = searchParams.get("callbackUrl") || searchParams.get("redirect") || "/";
            window.location.href = redirect;
        } catch (error: any) {
            // console.error("Login Error:", error);
            // Check for Network Error specifically
            const isNetworkError = error.message === "Network Error" || error.code === "ERR_NETWORK";

            let message = "Tên đăng nhập hoặc mật khẩu không đúng";

            if (error?.response?.data?.message) {
                message = error.response.data.message;
            } else if (isNetworkError) {
                message = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng hoặc thử lại sau.";
            }

            toast.error("Đăng nhập thất bại", {
                description: message,
            });
        }
    };

    const isSubmitting = loginMutation.isPending;

    return (
        <Card className="w-full max-w-md relative animate-fade-in shadow-xl border-border/50">
            <CardHeader className="space-y-4 text-center pb-2">
                {/* Logo */}
                <div className="flex justify-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg shadow-primary/25">
                        <Building2 className="w-8 h-8 text-primary-foreground" />
                    </div>
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold">eOffice</CardTitle>
                    <CardDescription>
                        Enterprise Office Management System
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="pt-4">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Tên đăng nhập</Label>
                        <Input
                            id="username"
                            placeholder="Nhập tên đăng nhập"
                            {...register("username")}
                            disabled={isSubmitting}
                            autoComplete="username"
                            autoFocus
                            className={errors.username ? "border-destructive" : ""}
                        />
                        {errors.username && (
                            <p className="text-sm text-destructive">{errors.username.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Mật khẩu</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Nhập mật khẩu"
                                {...register("password")}
                                disabled={isSubmitting}
                                autoComplete="current-password"
                                className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                        {errors.password && (
                            <p className="text-sm text-destructive">{errors.password.message}</p>
                        )}
                        <div className="flex justify-end">
                            <a href="/forgot-password" className="text-sm font-medium text-primary hover:underline hover:text-primary/80 transition-colors">
                                Quên mật khẩu?
                            </a>
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                    </Button>
                </form>

            </CardContent>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-3xl" />
            </div>

            <Suspense fallback={<div>Loading...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
