"use client"

/**
 * Custom Dialog — fully replaces @radix-ui/react-dialog
 * to eliminate Presence + compose-refs infinite loop on React 19.
 * Uses ReactDOM.createPortal to render at document.body level.
 * Features ultra-clean, lightweight fullscreen-only UI as per strategy.
 */

import * as React from "react"
import * as ReactDOM from "react-dom"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  onOpenChange: () => { },
})

function Dialog({ open: openProp, defaultOpen = false, onOpenChange, children }: {
  open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen
  const handleOpenChange = React.useCallback((v: boolean) => {
    if (!isControlled) setInternalOpen(v)
    onOpenChange?.(v)
  }, [isControlled, onOpenChange])
  return <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>{children}</DialogContext.Provider>
}

function DialogTrigger({ asChild, children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = React.useContext(DialogContext)
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { onClick?.(e); onOpenChange(true) }
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, { onClick: handleClick })
  }
  return <button type="button" data-slot="dialog-trigger" onClick={handleClick} {...props}>{children}</button>
}

function DialogPortal({ children }: { children: React.ReactNode;[k: string]: any }) { return <>{children}</> }

function DialogClose({ children, asChild, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = React.useContext(DialogContext)
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { onClick?.(e); onOpenChange(false) }
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, { onClick: handleClick })
  }
  return <button type="button" data-slot="dialog-close" onClick={handleClick} {...props}>{children}</button>
}

function DialogOverlay({ className, ...props }: React.ComponentProps<"div">) {
  const { onOpenChange } = React.useContext(DialogContext)
  // Slight backdrop tint for aesthetic context before rendering the fullscreen container
  return <div data-slot="dialog-overlay" className={cn("fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200", className)} onClick={() => onOpenChange(false)} {...props} />
}

function DialogContent({ className, children, showCloseButton = true, id, ...props }: React.HTMLAttributes<HTMLDivElement> & { showCloseButton?: boolean, id?: string }) {
  const { open, onOpenChange } = React.useContext(DialogContext)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = React.useState(false)

  // Effect to handle mount safely for hydration
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Auto focus first interactive element when opened
  React.useEffect(() => {
    if (!open) return
    const f = containerRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    if (f) requestAnimationFrame(() => f.focus())
  }, [open])

  // Scroll lock implementation for body
  React.useEffect(() => {
    if (!open) return
    const html = document.documentElement, body = document.body
    const oH = html.style.overflow, oB = body.style.overflow, oP = html.style.paddingRight
    const sw = window.innerWidth - html.clientWidth
    html.style.overflow = 'hidden'; body.style.overflow = 'hidden'
    if (sw > 0) html.style.paddingRight = `${sw}px`
    return () => { html.style.overflow = oH; body.style.overflow = oB; html.style.paddingRight = oP }
  }, [open])

  // Escape key handler to close dialog
  React.useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onOpenChange(false) } }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onOpenChange])


  if (!open || !mounted) return null

  // Strip arbitrary max-width restrictions from standard dialog usages since we are forcing Fullscreen
  const cleanClassName = className?.replace(/max-w-[^\s]+/g, '').replace(/sm:max-w-[^\s]+/g, '') || ''

  return ReactDOM.createPortal(
    <>
      <DialogOverlay />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        data-slot="dialog-content"
        data-state="open"
        // Base absolute/fixed layout ensuring it snaps to edges of the viewport exactly
        className={cn(
          "fixed inset-0 w-full h-full z-[110] bg-background text-foreground flex flex-col rounded-none overflow-hidden outline-none animate-in fade-in-0 zoom-in-95 duration-[250ms]",
          cleanClassName
        )}
        onClick={e => e.stopPropagation()}
        {...props}
      >
        {/* CLOSE CONTROL - Absolute positioning at top right */}
        {showCloseButton && (
          <div className="absolute top-4 right-4 z-[150]">
            <button
              type="button"
              data-slot="dialog-close"
              onClick={() => onOpenChange(false)}
              title="Đóng (Esc)"
              className="group flex items-center justify-center h-8 w-8 rounded-full bg-muted/80 hover:bg-red-500 text-muted-foreground hover:text-white shadow-sm border border-border transition-all outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            >
              <XIcon className="h-4 w-4 group-active:scale-90 transition-transform" />
            </button>
          </div>
        )}

        {/* CONTENT AREA */}
        <div className="flex-1 w-full h-full flex flex-col overflow-auto bg-background p-0 rounded-[inherit]">
          {children}
        </div>

      </div>
    </>,
    document.body
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  // Pad the header right specifically so content does not collide with the close button
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left px-6 sm:px-8 pt-6 pb-2 pr-16 bg-muted/30 border-b relative shrink-0", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, showCloseButton = false, children, ...props }: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-3 sm:flex-row sm:justify-end px-6 sm:px-8 py-4 bg-muted/30 border-t shrink-0 mt-auto", className)}
      {...props}
    >
      {children}
      {showCloseButton && <DialogClose asChild><Button variant="outline" className="min-w-[100px]">Đóng</Button></DialogClose>}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="dialog-title" className={cn("text-xl leading-none font-semibold tracking-tight truncate", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="dialog-description" className={cn("text-muted-foreground text-sm", className)} {...props} />
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger }
