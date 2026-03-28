/* ─── Sunplast Logo SVG (exact brand: red circle + "plast" navy + eOffice accent) ─── */

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
                    x={r * 1.72}
                    y={r * 1.05}
                    textAnchor="end"
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

    const totalW = size * 2.6;
    const totalH = size * 1.35;

    return (
        <svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`} fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <defs>
                <linearGradient id="eoffice-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="50%" stopColor="#0EA5E9" />
                    <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
            </defs>

            {/* Red circle */}
            <circle cx={r} cy={r} r={r} fill="#CC1E1E" />

            {/* "Sun" — sát mép phải hình tròn */}
            <text
                x={r * 1.72}
                y={r * 1.05}
                textAnchor="end"
                dominantBaseline="middle"
                fill="white"
                fontFamily="'Arial', sans-serif"
                fontWeight="800"
                fontSize={r * 0.72}
                letterSpacing="-0.5"
            >
                Sun
            </text>

            {/* "plast" — tăng khoảng cách so với hình tròn */}
            <text
                x={size * 1.08}
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

            {/* "eOffice" — dòng dưới, gradient nổi bật */}
            <text
                x={r * 0.15}
                y={size * 1.18}
                textAnchor="start"
                dominantBaseline="middle"
                fill="url(#eoffice-gradient)"
                fontFamily="'Inter', 'Arial', sans-serif"
                fontWeight="700"
                fontSize={r * 0.48}
                letterSpacing="0.5"
            >
                eOffice
            </text>
        </svg>
    );
}

export function SunplastLogoIcon({ size = 32, className }: { size?: number; className?: string }) {
    return <SunplastLogo size={size} showText={false} className={className} />;
}

