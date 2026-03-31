import { useEffect } from 'react';
import { useCompanySettings } from '@/hooks/useCompanySettings';

/**
 * THEME INJECTOR
 * Dynamically applies tenant branding (Primary Color) to the CSS variable system.
 * Converts Hex to HSL to maintain compatibility with Shadcn/Tailwind.
 */
export const ThemeInjector = () => {
    const { data: settings } = useCompanySettings();

    useEffect(() => {
        if (settings?.primary_color) {
            const hex = settings.primary_color;
            const hsl = hexToHsl(hex);
            
            if (hsl) {
                const root = document.documentElement;
                // Format: "h s% l%"
                const hslString = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
                root.style.setProperty('--primary', hslString);
                root.style.setProperty('--ring', hslString);
                
                // Also update sidebar if it uses primary
                root.style.setProperty('--sidebar-primary', hslString);
            }
        }
    }, [settings?.primary_color]);

    return null;
};

// Helper: Convert Hex to HSL
function hexToHsl(hex: string) {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse r, g, b
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}
