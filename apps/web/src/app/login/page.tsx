"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { Eye, EyeOff, Loader2, User, Lock, ShieldCheck } from "lucide-react";
import { loginSchema, LoginFormData } from "@/lib/validations";
import { useLogin } from "@/services/auth.service";

/* ─── Sunplast Logo SVG (exact brand: red circle + "plast" navy) ─── */
function SunplastLogo({ size = 48 }: { size?: number }) {
    const r = size * 0.5;
    return (
        <svg width={size * 2.6} height={size} viewBox={`0 0 ${size * 2.6} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Red circle */}
            <circle cx={r} cy={r} r={r} fill="#CC1E1E" />
            {/* "Sun" in white inside circle */}
            <text
                x={r}
                y={r * 1.05}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontFamily="'Arial', sans-serif"
                fontWeight="800"
                fontSize={r * 0.72}
                letterSpacing="-0.5"
            >
                Sun
            </text>
            {/* "plast" in navy blue */}
            <text
                x={size * 1.12}
                y={r * 1.05}
                textAnchor="start"
                dominantBaseline="middle"
                fill="#1B3A8C"
                fontFamily="'Arial', sans-serif"
                fontWeight="800"
                fontSize={r * 0.72}
                letterSpacing="-0.5"
            >
                plast
            </text>
        </svg>
    );
}

/* ─── Dot-grid SVG background pattern ─── */
function DotGrid() {
    return (
        <svg
            className="absolute inset-0 w-full h-full opacity-[0.045] pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                    <circle cx="1.5" cy="1.5" r="1.5" fill="#1B3A8C" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
    );
}

/* ─── Main Login Form ─── */
function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showPassword, setShowPassword] = useState(false);
    const [mounted, setMounted] = useState(false);
    const loginMutation = useLogin();

    useEffect(() => { setMounted(true); }, []);

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: { username: "", password: "" },
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            const res = await loginMutation.mutateAsync({ username: data.username, password: data.password });
            if (res?.accessToken) {
                localStorage.setItem("accessToken", res.accessToken);
                if (res.refreshToken) localStorage.setItem("refreshToken", res.refreshToken);
                document.cookie = `accessToken=${res.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
            }
            toast.success("Đăng nhập thành công!", { description: "Chào mừng bạn quay trở lại" });
            const redirect = searchParams.get("callbackUrl") || searchParams.get("redirect") || "/";
            window.location.href = redirect;
        } catch (error: any) {
            const isNetwork = error.message === "Network Error" || error.code === "ERR_NETWORK";
            const message = error?.response?.data?.message
                || (isNetwork ? "Không thể kết nối đến máy chủ." : "Tên đăng nhập hoặc mật khẩu không đúng");
            toast.error("Đăng nhập thất bại", { description: message });
        }
    };

    const isSubmitting = loginMutation.isPending;

    return (
        <div
            className={`relative min-h-screen w-full flex flex-col items-center justify-between bg-[#F5F6FA] transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}
        >
            <DotGrid />

            {/* ── Top brand bar ── */}
            <header className="relative z-10 w-full px-6 py-4 sm:px-10 flex items-center justify-between border-b border-slate-200/80 bg-white/70 backdrop-blur-sm">
                <SunplastLogo size={34} />
                <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase hidden sm:block">eOffice Enterprise Suite</span>
            </header>

            {/* ── Center card ── */}
            <main className="relative z-10 flex-1 flex items-center justify-center w-full px-4 py-10">
                <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_8px_40px_-8px_rgba(27,58,140,0.13)] border border-slate-100 px-8 py-9 sm:px-10 sm:py-10">

                    {/* Card header */}
                    <div className="flex flex-col items-center mb-8 space-y-3">
                        <SunplastLogo size={40} />
                        <div className="text-center">
                            <h1 className="text-xl font-bold text-slate-800 mt-1">Chào mừng trở lại</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Đăng nhập vào Sunplast eOffice</p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-7" />

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Username */}
                        <div className="space-y-1.5">
                            <label htmlFor="username" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Tên đăng nhập
                            </label>
                            <div className="relative">
                                <User className="absolute left-0 bottom-[10px] w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    id="username"
                                    placeholder="Nhập tên đăng nhập"
                                    {...register("username")}
                                    disabled={isSubmitting}
                                    autoComplete="username"
                                    autoFocus
                                    className={`w-full pl-6 pb-2 pt-1 bg-transparent border-0 border-b-2 text-sm text-slate-800 placeholder:text-slate-300 outline-none transition-colors
                                        ${errors.username
                                            ? "border-red-400 focus:border-red-500"
                                            : "border-slate-200 focus:border-[#CC1E1E]"
                                        }`}
                                />
                            </div>
                            {errors.username && (
                                <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label htmlFor="password" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-0 bottom-[10px] w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Nhập mật khẩu"
                                    {...register("password")}
                                    disabled={isSubmitting}
                                    autoComplete="current-password"
                                    className={`w-full pl-6 pr-8 pb-2 pt-1 bg-transparent border-0 border-b-2 text-sm text-slate-800 placeholder:text-slate-300 outline-none transition-colors
                                        ${errors.password
                                            ? "border-red-400 focus:border-red-500"
                                            : "border-slate-200 focus:border-[#CC1E1E]"
                                        }`}
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowPassword(p => !p)}
                                    className="absolute right-0 bottom-[8px] text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full mt-2 h-11 rounded-xl bg-[#CC1E1E] hover:bg-[#B01818] active:bg-[#941414] text-white font-semibold text-sm tracking-wide shadow-md shadow-red-600/20 hover:shadow-red-600/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Đang xác thực...</span>
                                </>
                            ) : (
                                "Đăng nhập"
                            )}
                        </button>
                    </form>

                    {/* SSL badge */}
                    <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Kết nối an toàn — SSL/TLS Encrypted</span>
                    </div>
                </div>
            </main>

            {/* ── Footer ── */}
            <footer className="relative z-10 w-full py-4 text-center">
                <p className="text-[11px] text-slate-400">
                    © 2026 <span className="font-semibold text-[#1B3A8C]">Sunplast</span> Corporation · All rights reserved
                </p>
            </footer>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#F5F6FA]">
                <Loader2 className="w-7 h-7 animate-spin text-[#CC1E1E]" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
