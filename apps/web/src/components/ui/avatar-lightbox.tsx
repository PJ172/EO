"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

// ============================================
// Context toàn cục để điều khiển Lightbox Avatar
// ============================================
interface AvatarLightboxContextType {
    openLightbox: (src: string, alt?: string) => void
}

const AvatarLightboxContext = React.createContext<AvatarLightboxContextType | null>(null)

export function useAvatarLightbox() {
    return React.useContext(AvatarLightboxContext)
}

// ============================================
// Provider bọc toàn bộ ứng dụng
// ============================================
export function AvatarLightboxProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [imageSrc, setImageSrc] = React.useState("")
    const [imageAlt, setImageAlt] = React.useState("")

    const openLightbox = React.useCallback((src: string, alt?: string) => {
        setImageSrc(src)
        setImageAlt(alt || "Avatar")
        setIsOpen(true)
    }, [])

    const closeLightbox = React.useCallback(() => {
        setIsOpen(false)
        // Delay reset để animation đóng mượt hơn
        setTimeout(() => {
            setImageSrc("")
            setImageAlt("")
        }, 300)
    }, [])

    // Đóng khi nhấn Escape
    React.useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeLightbox()
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, closeLightbox])

    return (
        <AvatarLightboxContext.Provider value={{ openLightbox }}>
            {children}

            {/* Overlay Lightbox */}
            {isOpen && (
                <div
                    className={cn(
                        "fixed inset-0 z-[9999] flex items-center justify-center",
                        "bg-black/70 backdrop-blur-sm",
                        "animate-in fade-in duration-200"
                    )}
                    onClick={closeLightbox}
                >
                    {/* Nút đóng */}
                    <button
                        onClick={closeLightbox}
                        className={cn(
                            "absolute top-4 right-4 z-[10000]",
                            "h-10 w-10 rounded-full",
                            "bg-white/10 hover:bg-white/20 backdrop-blur-md",
                            "flex items-center justify-center",
                            "text-white/80 hover:text-white",
                            "transition-all duration-200",
                            "border border-white/20",
                            "shadow-lg"
                        )}
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {/* Hình ảnh phóng to */}
                    <div
                        className={cn(
                            "relative max-w-[90vw] max-h-[85vh]",
                            "animate-in zoom-in-75 duration-300"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                            <img
                                src={imageSrc}
                                alt={imageAlt}
                                className="max-w-[90vw] max-h-[85vh] object-contain bg-black/50"
                                draggable={false}
                            />
                        </div>
                        {imageAlt && imageAlt !== "Avatar" && (
                            <p className="text-center text-white/70 text-sm mt-3 font-medium tracking-wide">
                                {imageAlt}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </AvatarLightboxContext.Provider>
    )
}
