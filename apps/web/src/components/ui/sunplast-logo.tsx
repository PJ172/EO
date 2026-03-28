/* ─── Sunplast Logo SVG (exact brand: red circle + "plast" navy) ─── */

interface SunplastLogoProps {
    size?: number;
    showText?: boolean;
    className?: string;
}

export function SunplastLogo({ size = 48, showText = true, className }: SunplastLogoProps) {
    const r = size * 0.5;

    if (!showText) {
        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <circle cx={r} cy={r} r={r} fill="#CC1E1E" />
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
            </svg>
        );
    }

    return (
        <svg width={size * 2.2} height={size} viewBox={`0 0 ${size * 2.2} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx={r} cy={r} r={r} fill="#CC1E1E" />
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
            <text
                x={size * 0.88}
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

export function SunplastLogoIcon({ size = 32, className }: { size?: number; className?: string }) {
    return <SunplastLogo size={size} showText={false} className={className} />;
}
