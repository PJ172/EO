"use client"

/**
 * Custom Checkbox — replaces @radix-ui/react-checkbox
 * to eliminate Presence + compose-refs infinite loop on React 19.
 * Uses native HTML <button role="checkbox"> with matching Shadcn styles.
 */

import * as React from "react"
import { Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

type CheckedState = boolean | "indeterminate"

interface CheckboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'defaultChecked'> {
    checked?: CheckedState
    defaultChecked?: CheckedState
    onCheckedChange?: (checked: CheckedState) => void
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
    ({ className, checked: checkedProp, defaultChecked = false, onCheckedChange, disabled, onClick, ...props }, ref) => {
        const [internalChecked, setInternalChecked] = React.useState<CheckedState>(defaultChecked)
        const isControlled = checkedProp !== undefined
        const checked = isControlled ? checkedProp : internalChecked
        const isChecked = checked === true
        const isIndeterminate = checked === "indeterminate"

        const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
            onClick?.(e)
            if (e.defaultPrevented) return
            const next = isChecked || isIndeterminate ? false : true
            if (!isControlled) setInternalChecked(next)
            onCheckedChange?.(next)
        }, [isChecked, isIndeterminate, isControlled, onCheckedChange, onClick])

        const dataState = isIndeterminate ? "indeterminate" : isChecked ? "checked" : "unchecked"

        return (
            <button
                type="button"
                role="checkbox"
                aria-checked={isIndeterminate ? "mixed" : isChecked}
                data-state={dataState}
                disabled={disabled}
                className={cn(
                    "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
                    className
                )}
                onClick={handleClick}
                ref={ref}
                {...props}
            >
                {isChecked && (
                    <span className="flex items-center justify-center text-current">
                        <Check className="h-4 w-4" />
                    </span>
                )}
                {isIndeterminate && (
                    <span className="flex items-center justify-center text-current">
                        <Minus className="h-4 w-4" />
                    </span>
                )}
            </button>
        )
    }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
export type { CheckedState }
