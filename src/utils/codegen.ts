/**
 * Centralized Code Generator - Vietnamese Prefixes
 * 
 * ALL entity code generation must use this module.
 * Do NOT hardcode prefixes elsewhere in the codebase.
 */

// ============================================
// CODE PREFIX DEFINITIONS (VIỆT HÓA)
// ============================================
export const CODE_PREFIXES = {
    VEHICLE: 'XE',      // Xe
    DRIVER: 'TX',       // Tài xế
    CUSTOMER: 'KH',     // Khách hàng
    ROUTE: 'TD',        // Tuyến đường
    TRIP: 'CD',         // Chuyến đi
    REVENUE: 'DT',      // Doanh thu
    EXPENSE: 'PC',      // Phiếu chi (Cũ là CP)
    MAINTENANCE: 'BD',  // Bảo trì (Cũ là BT)
    TRANSPORT_ORDER: 'DH', // Đơn hàng
} as const;

// ============================================
// CODE FORMAT SPECIFICATIONS
// ============================================
export const CODE_FORMATS = {
    // Simple: PREFIX + 4 digits = 6 chars
    VEHICLE: {
        prefix: CODE_PREFIXES.VEHICLE,
        digitCount: 4,
        length: 6,
        pattern: /^XE\d{4}$/,
        example: 'XE0012',
    },
    DRIVER: {
        prefix: CODE_PREFIXES.DRIVER,
        digitCount: 4,
        length: 6,
        pattern: /^TX\d{4}$/,
        example: 'TX0034',
    },
    CUSTOMER: {
        prefix: CODE_PREFIXES.CUSTOMER,
        digitCount: 4,
        length: 6,
        pattern: /^KH\d{4}$/,
        example: 'KH0120',
    },
    ROUTE: {
        prefix: CODE_PREFIXES.ROUTE,
        digitCount: 4,
        length: 6,
        pattern: /^TD\d{4}$/,
        example: 'TD0008',
    },
    TRIP: {
        prefix: CODE_PREFIXES.TRIP,
        digitCount: 2,
        hasDate: true,
        separator: '-',
        pattern: /^CD\d{4}-\d{1,3}$/,
        example: 'CD2604-01',
    },
    REVENUE: {
        prefix: CODE_PREFIXES.REVENUE,
        digitCount: 4,
        length: 6,
        pattern: /^DT\d{4}$/,
        example: 'DT0001',
    },
    EXPENSE: {
        prefix: CODE_PREFIXES.EXPENSE,
        digitCount: 4,
        length: 6,
        pattern: /^PC\d{4}$/,
        example: 'PC0001',
    },
    MAINTENANCE: {
        prefix: CODE_PREFIXES.MAINTENANCE,
        digitCount: 4,
        length: 6,
        pattern: /^BD\d{4}$/,
        example: 'BD0001',
    },
    TRANSPORT_ORDER: {
        prefix: CODE_PREFIXES.TRANSPORT_ORDER,
        digitCount: 4,
        length: 6,
        pattern: /^DH\d{4}$/,
        example: 'DH0001',
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
    // Handle dash-separated format: CD2604-01
    const separator = 'separator' in format ? (format as any).separator : '';
    if (separator && code.includes(separator)) {
        const parts = code.split(separator);
        return parseInt(parts[parts.length - 1], 10) || 0;
    }
    const digitPart = code.slice(-format.digitCount);
    return parseInt(digitPart, 10) || 0;
}

/**
 * Generate simple code (PREFIX + 4 digits)
 * @param prefix - The prefix (XE, TX, KH, TD)
 * @param sequence - The sequence number
 */
export function generateSimpleCode(prefix: string, sequence: number): string {
    return `${prefix}${String(sequence).padStart(4, '0')}`;
}

/**
 * Generate date-based code (PREFIX + YYMM + 4 digits)
 * @param prefix - The prefix (CD, DT, CP, BT)
 * @param sequence - The sequence number
 * @param yymm - Optional YYMM override (defaults to current)
 */
export function generateDateCode(prefix: string, sequence: number, yymm?: string, separator: string = ''): string {
    const dateStr = yymm || getCurrentYYMM();
    return `${prefix}${dateStr}${separator}${String(sequence).padStart(2, '0')}`;
}

// ============================================
// CODE GENERATORS (Public API)
// ============================================

export type EntityType = 'vehicle' | 'driver' | 'customer' | 'route' | 'trip' | 'expense' | 'revenue' | 'maintenance' | 'transport_order';

/**
 * Get next code for an entity type
 * @param entityType - The entity type
 * @param lastCode - The last used code (optional)
 * @param existingCodes - Array of existing codes to avoid duplicates
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
    const hasDate = 'hasDate' in format && format.hasDate;

    // Extract highest sequence from existingCodes if provided
    let maxSequence = 0;
    if (existingCodes && existingCodes.length > 0) {
        const currentYYMM = getCurrentYYMM();
        for (const code of existingCodes) {
            if (!code) continue;
            // For date-based codes, only count codes from current month
            if (hasDate) {
                const codeYYMM = code.slice(2, 6);
                if (codeYYMM === currentYYMM) {
                    const seq = extractSequenceNumber(code, format);
                    if (seq > maxSequence) maxSequence = seq;
                }
            } else {
                const seq = extractSequenceNumber(code, format);
                if (seq > maxSequence) maxSequence = seq;
            }
        }
    } else if (lastCode) {
        maxSequence = extractSequenceNumber(lastCode, format);
    }

    const nextSequence = maxSequence + 1;

    if (hasDate) {
        const separator = 'separator' in format ? (format as any).separator : '';
        return generateDateCode(format.prefix, nextSequence, undefined, separator);
    } else {
        return generateSimpleCode(format.prefix, nextSequence);
    }
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

    if (code.length !== format.length) {
        return { valid: false, error: `Mã phải có ${format.length} ký tự (VD: ${format.example})` };
    }

    if (!format.pattern.test(code)) {
        return { valid: false, error: `Mã không đúng định dạng. VD: ${format.example}` };
    }

    return { valid: true };
}

/**
 * Convert old English prefix code to Vietnamese prefix
 * Used during migration
 */
export function convertOldCodeToNew(oldCode: string, entityType: EntityType): string | null {
    if (!oldCode) return null;

    const mappings: Record<EntityType, { oldPrefix: RegExp; newFormat: typeof CODE_FORMATS[keyof typeof CODE_FORMATS] }> = {
        vehicle: { oldPrefix: /^VEH[-]?/i, newFormat: CODE_FORMATS.VEHICLE },
        driver: { oldPrefix: /^DRV[-]?/i, newFormat: CODE_FORMATS.DRIVER },
        customer: { oldPrefix: /^CUS[-]?/i, newFormat: CODE_FORMATS.CUSTOMER },
        route: { oldPrefix: /^RTE[-]?/i, newFormat: CODE_FORMATS.ROUTE },
        trip: { oldPrefix: /^(TRP|CH)[-]?/i, newFormat: CODE_FORMATS.TRIP },
        expense: { oldPrefix: /^EXP[-]?/i, newFormat: CODE_FORMATS.EXPENSE },
        revenue: { oldPrefix: /^REV[-]?/i, newFormat: CODE_FORMATS.REVENUE },
        maintenance: { oldPrefix: /^(MAINT|MNT|ORD)[-]?/i, newFormat: CODE_FORMATS.MAINTENANCE },
        transport_order: { oldPrefix: /^(DH|ORD)[-]?/i, newFormat: CODE_FORMATS.TRANSPORT_ORDER },
    };

    const mapping = mappings[entityType];
    if (!mapping.oldPrefix.test(oldCode)) {
        // Already in new format or unknown format
        if (mapping.newFormat.pattern.test(oldCode)) {
            return oldCode; // Already converted
        }
        return null; // Unknown format
    }

    // Extract numeric part from old code
    const numericPart = oldCode.replace(mapping.oldPrefix, '').replace(/[-_]/g, '');
    const digits = numericPart.replace(/\D/g, '');

    if (!digits) return null;

    const hasDate = 'hasDate' in mapping.newFormat && mapping.newFormat.hasDate;
    const sequence = parseInt(digits.slice(-4) || digits, 10);

    if (hasDate) {
        // Try to extract YYMM from old code, or use current
        const possibleYYMM = digits.slice(0, 4);
        const yymm = /^\d{4}$/.test(possibleYYMM) ? possibleYYMM : getCurrentYYMM();
        return generateDateCode(mapping.newFormat.prefix, sequence, yymm);
    } else {
        return generateSimpleCode(mapping.newFormat.prefix, sequence);
    }
}

// ============================================
// EXPORT INDIVIDUAL GENERATORS (Convenience)
// ============================================

export const vehicleCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('vehicle', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'vehicle'),
    convert: (oldCode: string) => convertOldCodeToNew(oldCode, 'vehicle'),
    format: CODE_FORMATS.VEHICLE,
};

export const driverCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('driver', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'driver'),
    convert: (oldCode: string) => convertOldCodeToNew(oldCode, 'driver'),
    format: CODE_FORMATS.DRIVER,
};

export const customerCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('customer', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'customer'),
    convert: (oldCode: string) => convertOldCodeToNew(oldCode, 'customer'),
    format: CODE_FORMATS.CUSTOMER,
};

export const routeCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('route', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'route'),
    convert: (oldCode: string) => convertOldCodeToNew(oldCode, 'route'),
    format: CODE_FORMATS.ROUTE,
};

export const tripCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('trip', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'trip'),
    convert: (oldCode: string) => convertOldCodeToNew(oldCode, 'trip'),
    format: CODE_FORMATS.TRIP,
};

export const expenseCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('expense', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'expense'),
    convert: (oldCode: string) => convertOldCodeToNew(oldCode, 'expense'),
    format: CODE_FORMATS.EXPENSE,
};

export const revenueCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('revenue', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'revenue'),
    convert: (oldCode: string) => convertOldCodeToNew(oldCode, 'revenue'),
    format: CODE_FORMATS.REVENUE,
};

export const maintenanceCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('maintenance', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'maintenance'),
    convert: (oldCode: string) => convertOldCodeToNew(oldCode, 'maintenance'),
    format: CODE_FORMATS.MAINTENANCE,
};

export const transportOrderCode = {
    getNext: (lastCode?: string | null, existingCodes?: string[]) =>
        getNextCode('transport_order', lastCode, existingCodes),
    validate: (code: string) => validateCode(code, 'transport_order'),
    convert: (oldCode: string) => convertOldCodeToNew(oldCode, 'transport_order'),
    format: CODE_FORMATS.TRANSPORT_ORDER,
};
