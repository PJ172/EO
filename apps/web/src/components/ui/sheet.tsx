"use client"

/**
 * Custom Sheet — fully replaces @radix-ui/react-dialog Sheet
 * to eliminate Presence + compose-refs infinite loop on React 19.
 * Uses ReactDOM.createPortal to render at document.body level.
 */

import * as React from "react"
import * as ReactDOM from "react-dom"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SheetContextValue { open: boolean; onOpenChange: (v: boolean) => void }
const SheetContext = React.createContext<SheetContextValue>({ open: false, onOpenChange: () => { } })

function Sheet({ open: openProp, defaultOpen = false, onOpenChange, children, ...props }: {
  open?: boolean; defaultOpen?: boolean; onOpenChange?: (v: boolean) => void; children: React.ReactNode;[k: string]: any
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen
  const handleOpenChange = React.useCallback((v: boolean) => {
    if (!isControlled) setInternalOpen(v); onOpenChange?.(v)
  }, [isControlled, onOpenChange])
  return <SheetContext.Provider value={{ open, onOpenChange: handleOpenChange }}>{children}</SheetContext.Provider>
}

function SheetTrigger({ children, ...props }: React.ComponentProps<"button">) {
  const { onOpenChange } = React.useContext(SheetContext)
  return <button type="button" data-slot="sheet-trigger" onClick={() => onOpenChange(true)} {...props}>{children}</button>
}

function SheetClose({ children, ...props }: React.ComponentProps<"button">) {
  const { onOpenChange } = React.useContext(SheetContext)
  return <button type="button" data-slot="sheet-close" onClick={() => onOpenChange(false)} {...props}>{children}</button>
}

function SheetContent({ className, children, side = "right", showCloseButton = true, ...props }: React.HTMLAttributes<HTMLDivElement> & {
  side?: "top" | "right" | "bottom" | "left"; showCloseButton?: boolean
}) {
  const { open, onOpenChange } = React.useContext(SheetContext)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!open) return
    const html = document.documentElement, body = document.body
    const oH = html.style.overflow, oB = body.style.overflow, oP = html.style.paddingRight
    const sw = window.innerWidth - html.clientWidth
    html.style.overflow = 'hidden'; body.style.overflow = 'hidden'
    if (sw > 0) html.style.paddingRight = `${sw}px`
    return () => { html.style.overflow = oH; body.style.overflow = oB; html.style.paddingRight = oP }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onOpenChange(false) } }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onOpenChange])

  if (!open || !mounted) return null

  return ReactDOM.createPortal(
    <>
      <div data-slot="sheet-overlay" className="fixed inset-0 z-50 bg-black/50" onClick={() => onOpenChange(false)} />
      <div role="dialog" aria-modal="true" data-slot="sheet-content" data-state="open"
        className={cn("bg-background animate-in fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out",
          side === "right" && "slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          side === "left" && "slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top" && "slide-in-from-top inset-x-0 top-0 h-auto border-b",
          side === "bottom" && "slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t", className)}
        onClick={e => e.stopPropagation()} {...props}>
        {children}
        {showCloseButton && (
          <button type="button" onClick={() => onOpenChange(false)}
            className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none cursor-pointer">
            <XIcon className="size-4" /><span className="sr-only">Close</span>
          </button>
        )}
      </div>
    </>,
    document.body
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />
}
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
}
function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="sheet-title" className={cn("text-foreground font-semibold", className)} {...props} />
}
function SheetDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="sheet-description" className={cn("text-muted-foreground text-sm", className)} {...props} />
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription }
