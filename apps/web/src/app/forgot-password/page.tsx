"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api-client";
import { Loader2, ArrowLeft, Mail, Lock, KeyRound } from "lucide-react";

// Schema for Step 1: Email
const identifySchema = z.object({
    email: z.string().email("Email không hợp lệ").min(1, "Vui lòng nhập Email"),
});

// Schema for Step 2: OTP
const otpSchema = z.object({
    code: z.string().length(6, "Mã xác thực gồm 6 số"),
});

// Schema for Step 3: Reset
const resetSchema = z.object({
    newPassword: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
});

type IdentifyData = z.infer<typeof identifySchema>;
type OtpData = z.infer<typeof otpSchema>;
type ResetData = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [errorData, setErrorData] = useState<string | null>(null);

    // Shared state
    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");

    // Forms
    const identifyForm = useForm<IdentifyData>({
        resolver: zodResolver(identifySchema),
    });

    const otpForm = useForm<OtpData>({
        resolver: zodResolver(otpSchema),
    });

    const resetForm = useForm<ResetData>({
        resolver: zodResolver(resetSchema),
    });

    // Handlers
    const onIdentifySubmit = async (data: IdentifyData) => {
        setIsLoading(true);
        setErrorData(null);
        try {
            await authApi.forgotPassword(data.email);
            setEmail(data.email);
            setStep(2);
        } catch (error: any) {
            setErrorData(error.response?.data?.message || "Đã có lỗi xảy ra");
        } finally {
            setIsLoading(false);
        }
    };

    const onOtpSubmit = async (data: OtpData) => {
        setIsLoading(true);
        setErrorData(null);
        try {
            const res = await authApi.verifyOtp(email, data.code);
            if (res.valid) {
                setOtpCode(data.code);
                setStep(3);
            }
        } catch (error: any) {
            setErrorData(error.response?.data?.message || "Mã xác thực không đúng");
        } finally {
            setIsLoading(false);
        }
    };

    const onResetSubmit = async (data: ResetData) => {
        setIsLoading(true);
        setErrorData(null);
        try {
            await authApi.resetPassword(email, otpCode, data.newPassword);
            // Success - Redirect to Login
            router.push("/login?reset=success");
        } catch (error: any) {
            setErrorData(error.response?.data?.message || "Đổi mật khẩu thất bại");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar Image */}
            <div className="hidden w-1/2 lg:block relative">
                <div className="absolute inset-0 bg-primary/90 mix-blend-multiply" />
                <div className="absolute inset-0 flex items-center justify-center text-white p-12">
                    <div>
                        <h2 className="text-4xl font-bold mb-6">eOffice Enterprise</h2>
                        <p className="text-lg opacity-90">Hệ thống quản trị doanh nghiệp toàn diện.</p>
                    </div>
                </div>
            </div>

            <div className="flex w-full flex-col justify-center px-8 lg:w-1/2">
                <div className="mx-auto w-full max-w-md space-y-8">
                    <button
                        onClick={() => router.push('/login')}
                        className="flex items-center text-sm text-slate-500 hover:text-primary mb-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại đăng nhập
                    </button>

                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            {step === 1 && "Quên mật khẩu?"}
                            {step === 2 && "Nhập mã xác thực"}
                            {step === 3 && "Đặt lại mật khẩu"}
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            {step === 1 && "Nhập email để nhận mã khôi phục tài khoản."}
                            {step === 2 && `Mã xác thực đã được gửi đến ${email}`}
                            {step === 3 && "Vui lòng nhập mật khẩu mới cho tài khoản của bạn."}
                        </p>
                    </div>

                    {errorData && (
                        <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-200">
                            {errorData}
                        </div>
                    )}

                    {/* STEP 1: EMAIL */}
                    {step === 1 && (
                        <form onSubmit={identifyForm.handleSubmit(onIdentifySubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <input
                                        {...identifyForm.register("email")}
                                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-10 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="nguyenvan@example.com"
                                    />
                                </div>
                                {identifyForm.formState.errors.email && (
                                    <p className="text-xs text-red-500">{identifyForm.formState.errors.email.message}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex w-full justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Gửi mã xác thực
                            </button>
                        </form>
                    )}

                    {/* STEP 2: OTP */}
                    {step === 2 && (
                        <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Mã OTP (6 số)</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <input
                                        {...otpForm.register("code")}
                                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-10 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center tracking-widest text-lg font-mono"
                                        placeholder="123456"
                                        maxLength={6}
                                    />
                                </div>
                                {otpForm.formState.errors.code && (
                                    <p className="text-xs text-red-500">{otpForm.formState.errors.code.message}</p>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-1/3 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                                >
                                    Gửi lại
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-2/3 flex justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                                >
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Xác thực
                                </button>
                            </div>
                        </form>
                    )}

                    {/* STEP 3: RESET */}
                    {step === 3 && (
                        <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Mật khẩu mới</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <input
                                        type="password"
                                        {...resetForm.register("newPassword")}
                                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-10 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                {resetForm.formState.errors.newPassword && (
                                    <p className="text-xs text-red-500">{resetForm.formState.errors.newPassword.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nhập lại mật khẩu</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <input
                                        type="password"
                                        {...resetForm.register("confirmPassword")}
                                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-10 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                {resetForm.formState.errors.confirmPassword && (
                                    <p className="text-xs text-red-500">{resetForm.formState.errors.confirmPassword.message}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex w-full justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Đổi mật khẩu
                            </button>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}
