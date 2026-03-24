'use client';
import { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Mail, Phone, X } from 'lucide-react';
import { Avatar as BaseAvatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getAvatarUrl } from '@/lib/avatar-utils';
import { getAvatarVariant, cn } from '@/lib/utils';

const SERVER_BASE = process.env.NEXT_PUBLIC_SOCKET_URL
    || (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', ''))
    || 'http://localhost:3001';

function resolveAvatarUrl(avatar?: string | null, variant: 'thumb' | 'medium' | 'orig' = 'thumb'): string | null {
    if (!avatar) return null;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
    const v = getAvatarVariant(avatar, variant);
    if (!v) return null;
    return `${SERVER_BASE}${v}`;
}

interface OrgChartAvatarProps {
    name: string;
    avatar?: string | null;
    jobTitle?: string | null;
    email?: string | null;
    phone?: string | null;
    refreshKey?: number;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const OrgChartAvatar = memo(function OrgChartAvatar({
    name, avatar, jobTitle, email, phone, refreshKey, className, size = 'md'
}: OrgChartAvatarProps) {
    const [imgError, setImgError] = useState(false);
    const [usedFallback, setUsedFallback] = useState(false);
    const [open, setOpen] = useState(false);

    const suffix = refreshKey ? `?t=${refreshKey}` : '';
    const thumbUrl = resolveAvatarUrl(avatar, 'thumb');
    const mediumUrl = resolveAvatarUrl(avatar, 'medium');
    
    const baseRaw = avatar
        ? (avatar.startsWith('http') ? avatar : `${SERVER_BASE}${avatar}`)
        : null;
    const rawUrl = baseRaw ? `${baseRaw}${suffix}` : null;

    const avatarSrc = imgError
        ? getAvatarUrl(name, 256)
        : (!usedFallback && thumbUrl) ? `${thumbUrl}${suffix}`
        : (rawUrl || getAvatarUrl(name, 256));

    const handleImgError = () => {
        if (!usedFallback && thumbUrl && thumbUrl !== rawUrl) {
            setUsedFallback(true);
        } else {
            setImgError(true);
        }
    };

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const stopAll = (e: React.SyntheticEvent) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
    };

    const sizeClasses = {
        sm: 'w-10 h-10',
        md: 'w-14 h-14',
        lg: 'w-20 h-20'
    };

    const lightboxContent = open ? (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            }}
            onClick={() => setOpen(false)}
            onPointerDown={stopAll}
            onMouseDown={stopAll}
        >
            <div
                style={{
                    position: 'relative',
                    background: 'linear-gradient(135deg,#1e293b,#0f172a)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 24,
                    overflow: 'hidden',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                    maxWidth: 400,
                    width: '90vw',
                }}
                onClick={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
            >
                <button
                    onClick={() => setOpen(false)}
                    style={{
                        position: 'absolute', top: 12, right: 12, zIndex: 10,
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <X className="w-4 h-4 text-white" />
                </button>

                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 32, paddingBottom: 16 }}>
                    <img
                        src={(mediumUrl ? `${mediumUrl}${suffix}` : null) || avatarSrc}
                        alt={name}
                        onError={(e) => { (e.target as HTMLImageElement).src = avatarSrc; }}
                        style={{ width: 180, height: 180, borderRadius: '50%', objectFit: 'cover',
                            outline: '4px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                    />
                </div>

                <div style={{ padding: '0 24px 28px', textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{name}</h2>
                    {jobTitle && (
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{jobTitle}</p>
                    )}
                    {(email || phone) && (
                        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {email && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                    <Mail style={{ width: 16, height: 16, color: '#60a5fa', flexShrink: 0 }} />
                                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{email}</span>
                                </div>
                            )}
                            {phone && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                    <Phone style={{ width: 16, height: 16, color: '#34d399', flexShrink: 0 }} />
                                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{phone}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
            <div
                onPointerDown={(e) => {
                    e.stopPropagation();
                    // Set open in next tick to avoid being caught by react-flow event handlers
                    setTimeout(() => setOpen(true), 0);
                }}
                className={cn("flex-shrink-0 cursor-zoom-in group/avatar relative z-50 nodrag nopan", className)}
            >
                <BaseAvatar className={cn(sizeClasses[size], "border-2 border-white/30 group-hover/avatar:border-white/70 transition-all duration-200 shadow-sm ring-2 ring-black/5")}>
                    <AvatarImage 
                        src={avatarSrc} 
                        alt={name} 
                        className="object-cover pointer-events-none" 
                        onError={handleImgError}
                    />
                    <AvatarFallback className="bg-slate-200 text-slate-600 font-bold uppercase pointer-events-none">
                        {name.charAt(0)}
                    </AvatarFallback>
                </BaseAvatar>
            </div>
            {typeof document !== 'undefined' && createPortal(lightboxContent, document.body)}
        </>
    );
});
