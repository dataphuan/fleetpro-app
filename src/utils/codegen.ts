/**
 * Centralized Code Generator - Professional Logistics Standard
 * 
 * ALL entity code generation must use this module.
 * Standardized on Global Logistics Prefixes (VEH, DRV, TRP, etc.)
 */

// ============================================
// CODE PREFIX DEFINITIONS (GLOBAL STANDARD)
// ============================================
export const CODE_PREFIXES = {
    VEHICLE: 'VEH',      // Vehicle
    DRIVER: 'DRV',       // Driver
    CUSTOMER: 'CUS',     // Customer
    ROUTE: 'RT',         // Route
    TRIP: 'TRP',         // Trip (Shipment)
    REVENUE: 'REV',      // Revenue
    EXPENSE: 'EXP',      // Expense
    MAINTENANCE: 'MNT',  // Maintenance
    TRANSPORT_ORDER: 'ORD', // Order
} as const;

// ============================================
// CODE FORMAT SPECIFICATIONS
// ============================================
export const CODE_FORMATS = {
    // Standard: PREFIX-YYMM-NN (Professional SaaS Pattern)
    VEHICLE: {
        prefix: CODE_PREFIXES.VEHICLE,
        digitCount: 2,
        hasDate: true,
        separator: '-',
        pattern: /^VEH-\d{4}-\d+$/,
        example: 'VEH-2604-01',
    },
    DRIVER: {
        prefix: CODE_PREFIXES.DRIVER,
        digitCount: 2,
        hasDate: true,
        separator: '-',
        pattern: /^DRV-\d{4}-\d+$/,
        example: 'DRV-2604-01',
    },
    CUSTOMER: {
        prefix: CODE_PREFIXES.CUSTOMER,
        digitCount: 2,
        hasDate: true,
        separator: '-',
        pattern: /^CUS-\d{4}-\d+$/,
        example: 'CUS-2604-01',
    },
    ROUTE: {
        prefix: CODE_PREFIXES.ROUTE,
        digitCount: 2,
        hasDate: true,
        separator: '-',
        pattern: /^RT-\d{4}-\d+$/,
        example: 'RT-2604-01',
    },
    TRIP: {
        prefix: CODE_PREFIXES.TRIP,
        digitCount: 2,
        hasDate: true,
        separator: '-',
        pattern: /^TRP-\d{4}-\d+$/,
        example: 'TRP-2604-01',
    },
    REVENUE: {
        prefix: CODE_PREFIXES.REVENUE,
        digitCount: 2,
        hasDate: true,
        separator: '-',
        pattern: /^REV-\d{4}-\d+$/,
        example: 'REV-2604-01',
    },
    EXPENSE: {
        prefix: CODE_PREFIXES.EXPENSE,
        digitCount: 2,
        hasDate: true,
        separator: '-',
        pattern: /^EXP-\d{4}-\d+$/,
        example: 'EXP-2604-01',
    },
    MAINTENANCE: {
        prefix: CODE_PREFIXES.MAINTENANCE,
        digitCount: 2,
        hasDate: true,
        separator: '-',
        pattern: /^MNT-\d{4}-\d+$/,
        example: 'MNT-2604-01',
    },
    TRANSPORT_ORDER: {
        prefix: CODE_PREFIXES.TRANSPORT_ORDER,
        digitCount: 2,
        hasDate: true,
        separator: '-',
        pattern: /^ORD-\d{4}-\d+$/,
        example: 'ORD-2604-01',
    },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get current YYMM string (e.g., "2602" for Feb 2026)
 */
export function getCurrentYYMM(): string {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
}

/**
 * Extract sequence number from existing code
 */
export function extractSequenceNumber(code: string, format: typeof CODE_FORMATS[keyof typeof CODE_FORMATS]): number {
    if (!code) return 0;
    // Handle dash-separated format: TRP-2604-01
    const separator = 'separator' in format ? (format as any).separator : '-';
    if (code.includes(separator)) {
        const parts = code.split(separator);
        return parseInt(parts[parts.length - 1], 10) || 0;
    }
    // Fallback for legacy simple codes
    const digits = code.replace(/\D/g, '');
    return parseInt(digits.slice(-2), 10) || 0;
}

/**
 * Generate standardized code (PREFIX-YYMM-NN)
 */
export function generateDateCode(prefix: string, sequence: number, yymm?: string, separator: string = '-'): string {
    const dateStr = yymm || getCurrentYYMM();
    return `${prefix}-${dateStr}${separator}${String(sequence).padStart(2, '0')}`;
}

// ============================================
// CODE GENERATORS (Public API)
// ============================================

export type EntityType = 'vehicle' | 'driver' | 'customer' | 'route' | 'trip' | 'expense' | 'revenue' | 'maintenance' | 'transport_order';

/**
 * Get next code for an entity type (Client-side helper)
 */
export function getNextCode(
    entityType: EntityType,
    lastCode?: string | null,
    existingCodes?: string[]
): string {
    const formatMap: Record<EntityType, typeof CODE_FORMATS[keyof typeof CODE_FORMATS]> = {
        vehicle: CODE_FORMATS.VEHICLE,
        driver: CODE_FORMATS.DRIVER,
        customer: CODE_FORMATS.CUSTOMER,
        route: CODE_FORMATS.ROUTE,
        trip: CODE_FORMATS.TRIP,
        expense: CODE_FORMATS.EXPENSE,
        revenue: CODE_FORMATS.REVENUE,
        maintenance: CODE_FORMATS.MAINTENANCE,
        transport_order: CODE_FORMATS.TRANSPORT_ORDER,
    };

    const format = formatMap[entityType];
    const currentYYMM = getCurrentYYMM();
    
    let maxSequence = 0;
    if (existingCodes && existingCodes.length > 0) {
        for (const code of existingCodes) {
            if (!code) continue;
            // Check if code matches current month if it's a date-based code
            if (code.includes(`-${currentYYMM}-`)) {
                const seq = extractSequenceNumber(code, format);
                if (seq > maxSequence) maxSequence = seq;
            }
        }
    } else if (lastCode) {
        maxSequence = extractSequenceNumber(lastCode, format);
    }

    const nextSequence = maxSequence + 1;
    return generateDateCode(format.prefix, nextSequence, currentYYMM, format.separator);
}

/**
 * Validate a code against its expected format
 */
export function validateCode(code: string, entityType: EntityType): { valid: boolean; error?: string } {
    const formatMap: Record<EntityType, typeof CODE_FORMATS[keyof typeof CODE_FORMATS]> = {
        vehicle: CODE_FORMATS.VEHICLE,
        driver: CODE_FORMATS.DRIVER,
        customer: CODE_FORMATS.CUSTOMER,
        route: CODE_FORMATS.ROUTE,
        trip: CODE_FORMATS.TRIP,
        expense: CODE_FORMATS.EXPENSE,
        revenue: CODE_FORMATS.REVENUE,
        maintenance: CODE_FORMATS.MAINTENANCE,
        transport_order: CODE_FORMATS.TRANSPORT_ORDER,
    };

    const format = formatMap[entityType];

    if (!code) {
        return { valid: false, error: `Mã không được để trống` };
    }

    if (!format.pattern.test(code)) {
        return { valid: false, error: `Mã sai chuẩn chuyên nghiệp (VD: ${format.example})` };
    }

    return { valid: true };
}

// ============================================
// EXPORT INDIVIDUAL GENERATORS (Convenience)
// ============================================

export const vehicleCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('vehicle', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'vehicle'),
    format: CODE_FORMATS.VEHICLE,
};

export const driverCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('driver', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'driver'),
    format: CODE_FORMATS.DRIVER,
};

export const customerCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('customer', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'customer'),
    format: CODE_FORMATS.CUSTOMER,
};

export const routeCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('route', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'route'),
    format: CODE_FORMATS.ROUTE,
};

export const tripCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('trip', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'trip'),
    format: CODE_FORMATS.TRIP,
};

export const expenseCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('expense', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'expense'),
    format: CODE_FORMATS.EXPENSE,
};

export const maintenanceCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('maintenance', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'maintenance'),
    format: CODE_FORMATS.MAINTENANCE,
};

export const transportOrderCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('transport_order', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'transport_order'),
    format: CODE_FORMATS.TRANSPORT_ORDER,
};
