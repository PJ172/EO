"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
    containerClassName?: string;
}

export function SearchBar({ className, containerClassName, value, defaultValue, onChange, ...props }: SearchBarProps) {
    const [localValue, setLocalValue] = React.useState(value ?? defaultValue ?? "");

    React.useEffect(() => {
        if (value !== undefined) {
            setLocalValue(value || "");
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalValue(val);
        if (onChange) {
            onChange(e);
        }
    };

    return (
        <div className={cn("relative w-full", containerClassName)}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                {...props}
                value={localValue}
                onChange={handleChange}
                className={cn(
                    "pl-10 h-8 w-full bg-background border-muted-foreground/20 focus-visible:ring-primary/20 rounded-lg",
                    className
                )}
            />
        </div>
    );
}
