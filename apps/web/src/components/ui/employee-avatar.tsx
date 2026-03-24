"use client";

import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getAvatarUrl, getInitials } from "@/lib/avatar-utils";
import { cn, getAvatarVariant } from "@/lib/utils";
import { useAvatarLightbox } from "@/components/ui/avatar-lightbox";

interface EmployeeAvatarProps {
    /** Server-stored avatar path, e.g. "/uploads/avatars/abc.jpg" */
    avatar?: string | null;
    /** Full name of the employee */
    fullName: string;
    /** Additional className for the Avatar wrapper */
    className?: string;
    /** Additional className for the image */
    imgClassName?: string;
    /** Additional className for the AvatarFallback */
    fallbackClassName?: string;
    /** Optimization Variant: 'thumb' (80px), 'medium' (400px), 'orig' (original) */
    variant?: 'thumb' | 'medium' | 'orig';
}

/**
 * Smart avatar component with 3-tier fallback:
 * 1. If `avatar` exists → try loading from NEXT_PUBLIC_SOCKET_URL
 * 2. If that fails (onError) → switch to getAvatarUrl() (deterministic color)
 * 3. If both fail → show text initials via AvatarFallback
 *
 * Resets error state when `avatar` prop changes (e.g. after new upload).
 */
export function EmployeeAvatar({
    avatar,
    fullName,
    className,
    imgClassName,
    fallbackClassName,
    variant = 'thumb',
}: EmployeeAvatarProps) {
    const [serverFailed, setServerFailed] = React.useState(false);
    const lightbox = useAvatarLightbox();

    // Reset error state when avatar prop changes (e.g. after upload)
    React.useEffect(() => {
        setServerFailed(false);
    }, [avatar]);

    const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

    const optimizedAvatar = getAvatarVariant(avatar, variant);

    const serverUrl = optimizedAvatar && !serverFailed
        ? `${baseUrl}${optimizedAvatar}`
        : null;

    const originalUrl = avatar && !serverFailed
        ? `${baseUrl}${getAvatarVariant(avatar, 'orig')}`
        : null;

    const src = serverUrl || getAvatarUrl(fullName);

    return (
        <Avatar className={className}>
            {/* Use native <img> for reliable onError handling */}
            <img
                src={src}
                alt={fullName}
                loading="lazy"
                decoding="async"
                className={cn(
                    "aspect-square size-full object-cover",
                    lightbox && src && "cursor-pointer hover:opacity-80 transition-opacity",
                    imgClassName
                )}
                onError={() => {
                    if (serverUrl) {
                        setServerFailed(true);
                    }
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (lightbox && src) {
                        // Always try to load original/medium variant for lightbox instead of thumbnail
                        lightbox.openLightbox(originalUrl || src, fullName);
                    }
                }}
            />
            <AvatarFallback className={fallbackClassName}>
                {getInitials(fullName)}
            </AvatarFallback>
        </Avatar>
    );
}
