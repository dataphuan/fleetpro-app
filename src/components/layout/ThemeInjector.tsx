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
        const root = document.documentElement;
        
        // Helper to apply hex color to CSS variable as HSL
        const applyColor = (hex: string, property: string) => {
            const hsl = hexToHsl(hex);
            if (hsl) {
                const hslString = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
                root.style.setProperty(property, hslString);
                return hslString;
            }
            return null;
        };

        if (settings?.primary_color) {
            const hslString = applyColor(settings.primary_color, '--primary');
            if (hslString) {
                root.style.setProperty('--ring', hslString);
                root.style.setProperty('--sidebar-primary', hslString);
                root.style.setProperty('--brand-primary', hslString);
            }
        }

        if (settings?.secondary_color) {
            applyColor(settings.secondary_color, '--secondary');
            applyColor(settings.secondary_color, '--brand-secondary');
        }

        if (settings?.accent_color) {
            applyColor(settings.accent_color, '--accent');
            applyColor(settings.accent_color, '--brand-accent');
        }

        if (settings?.border_radius) {
            root.style.setProperty('--brand-radius', `${settings.border_radius}px`);
        }
    }, [settings?.primary_color, settings?.secondary_color, settings?.accent_color, settings?.border_radius]);

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
