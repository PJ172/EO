"use client"

/**
 * Custom AlertDialog — fully replaces @radix-ui/react-alert-dialog
 * to eliminate Presence + compose-refs infinite loop on React 19.
 */

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

interface AlertDialogContextValue { open: boolean; onOpenChange: (v: boolean) => void }
const AlertDialogContext = React.createContext<AlertDialogContextValue>({ open: false, onOpenChange: () => { } })

function AlertDialog({ open: openProp, defaultOpen = false, onOpenChange, children }: {
    open?: boolean; defaultOpen?: boolean; onOpenChange?: (v: boolean) => void; children: React.ReactNode
}) {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
    const isControlled = openProp !== undefined
    const open = isControlled ? openProp : internalOpen
    const handleOpenChange = React.useCallback((v: boolean) => {
        if (!isControlled) setInternalOpen(v); onOpenChange?.(v)
    }, [isControlled, onOpenChange])
    return <AlertDialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>{children}</AlertDialogContext.Provider>
}

const AlertDialogTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
    ({ children, asChild, onClick, ...props }, ref) => {
        const { onOpenChange } = React.useContext(AlertDialogContext)
        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { onClick?.(e); onOpenChange(true) }
        if (asChild && React.isValidElement(children)) return React.cloneElement(children as React.ReactElement<any>, { onClick: handleClick })
        return <button type="button" ref={ref} onClick={handleClick} {...props}>{children}</button>
    }
)
AlertDialogTrigger.displayName = "AlertDialogTrigger"

const AlertDialogPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>
const AlertDialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("fixed inset-0 z-[99990] bg-black/80", className)} {...props} />
)
AlertDialogOverlay.displayName = "AlertDialogOverlay"

const AlertDialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
        const { open } = React.useContext(AlertDialogContext)
        React.useEffect(() => {
            if (!open) return
            const html = document.documentElement, body = document.body
            const oH = html.style.overflow, oB = body.style.overflow, oP = html.style.paddingRight
            const sw = window.innerWidth - html.clientWidth
            html.style.overflow = 'hidden'; body.style.overflow = 'hidden'
            if (sw > 0) html.style.paddingRight = `${sw}px`
            return () => { html.style.overflow = oH; body.style.overflow = oB; html.style.paddingRight = oP }
        }, [open])
        if (!open) return null

        const content = (
            <>
                <AlertDialogOverlay />
                <div ref={ref} role="alertdialog" aria-modal="true" tabIndex={-1} data-state="open"
                    className={cn("fixed left-[50%] top-[50%] z-[99999] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 sm:rounded-lg", className)} {...props}>
                    {children}
                </div>
            </>
        )

        // Only use portal on client side
        if (typeof document !== "undefined") {
            return createPortal(content, document.body)
        }
        return content
    }
)
AlertDialogContent.displayName = "AlertDialogContent"

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
)
AlertDialogHeader.displayName = "AlertDialogHeader"
const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
AlertDialogFooter.displayName = "AlertDialogFooter"
const AlertDialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => <h2 ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
)
AlertDialogTitle.displayName = "AlertDialogTitle"
const AlertDialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
)
AlertDialogDescription.displayName = "AlertDialogDescription"
const AlertDialogAction = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ className, ...props }, ref) => <button ref={ref} className={cn(buttonVariants(), className)} {...props} />
)
AlertDialogAction.displayName = "AlertDialogAction"
const AlertDialogCancel = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ className, onClick, ...props }, ref) => {
        const { onOpenChange } = React.useContext(AlertDialogContext)
        return <button ref={ref} className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)} onClick={e => { onClick?.(e); onOpenChange(false) }} {...props} />
    }
)
AlertDialogCancel.displayName = "AlertDialogCancel"

export { AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel }
