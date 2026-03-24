/**
 * Avatar utility functions for consistent avatar rendering across the app.
 * Uses a deterministic hash so the same name always produces the same color.
 */

// Predefined color palette – vibrant, professional, accessible
const AVATAR_COLORS = [
    '4f46e5', // indigo
    '7c3aed', // violet
    'db2777', // pink
    'dc2626', // red
    'ea580c', // orange
    'ca8a04', // yellow
    '16a34a', // green
    '0d9488', // teal
    '0284c7', // sky
    '2563eb', // blue
    '9333ea', // purple
    'c026d3', // fuchsia
    '059669', // emerald
    'd97706', // amber
    'e11d48', // rose
    '0891b2', // cyan
];

/**
 * Simple string hash function (djb2 algorithm).
 * Produces a consistent integer for the same input string.
 */
function hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash);
}

/**
 * Returns a deterministic avatar URL for the given name.
 * Same name → same color, every time, on every page.
 *
 * @param name - Full name of the person (e.g. "Lê Bình Phương")
 * @param size - Image size in pixels (default 128)
 */
export function getAvatarUrl(name: string, size: number = 128): string {
    const safeName = name || 'N A';
    const colorIndex = hashString(safeName) % AVATAR_COLORS.length;
    const bg = AVATAR_COLORS[colorIndex];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&background=${bg}&color=fff&size=${size}&bold=true`;
}

/**
 * Returns the deterministic background color hex for a given name.
 * Useful for inline avatar circles rendered without ui-avatars.com.
 */
export function getAvatarColor(name: string): string {
    const safeName = name || 'N A';
    const colorIndex = hashString(safeName) % AVATAR_COLORS.length;
    return `#${AVATAR_COLORS[colorIndex]}`;
}

/**
 * Returns the 2-character initials for a given name.
 */
export function getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
