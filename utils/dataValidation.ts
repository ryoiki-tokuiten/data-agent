/**
 * Data validation utilities for chart components
 * Handles edge cases where AI-generated data doesn't match expected structure
 */

/**
 * Validates if a key exists in data object and contains numeric values
 */
export function validateNumericKey(
    data: any[],
    key: string | undefined,
    keyName: string = 'key'
): { isValid: boolean; validCount: number; totalCount: number; error?: string } {
    if (!key) {
        return { isValid: false, validCount: 0, totalCount: 0, error: `${keyName} is undefined` };
    }

    if (!Array.isArray(data) || data.length === 0) {
        return { isValid: false, validCount: 0, totalCount: 0, error: 'Data is empty or not an array' };
    }

    let validCount = 0;
    const totalCount = data.length;

    for (const item of data) {
        const value = item[key];
        if (typeof value === 'number' && !isNaN(value)) {
            validCount++;
        } else if (typeof value === 'string') {
            const parsed = parseFloat(value);
            if (!isNaN(parsed)) {
                validCount++;
            }
        }
    }

    const isValid = validCount > 0;
    const error = isValid ? undefined : `No valid numeric values found for key "${key}"`;

    return { isValid, validCount, totalCount, error };
}

/**
 * Validates if a key exists in data objects
 */
export function validateKeyExists(
    data: any[],
    key: string | undefined,
    keyName: string = 'key'
): { exists: boolean; error?: string } {
    if (!key) {
        return { exists: false, error: `${keyName} is undefined` };
    }

    if (!Array.isArray(data) || data.length === 0) {
        return { exists: false, error: 'Data is empty or not an array' };
    }

    // Check if at least one item has this key
    const exists = data.some(item => item && key in item);
    const error = exists ? undefined : `Key "${key}" not found in any data items`;

    return { exists, error };
}

/**
 * Sanitizes data by converting string numbers to actual numbers for specified keys
 */
export function sanitizeNumericKeys(
    data: any[],
    keys: string[]
): any[] {
    if (!Array.isArray(data) || data.length === 0) {
        return data;
    }

    return data.map(item => {
        const sanitized = { ...item };
        for (const key of keys) {
            if (key in sanitized) {
                const value = sanitized[key];
                if (typeof value === 'string') {
                    const parsed = parseFloat(value);
                    if (!isNaN(parsed)) {
                        sanitized[key] = parsed;
                    }
                } else if (typeof value === 'number' && isNaN(value)) {
                    // Remove NaN values
                    delete sanitized[key];
                }
            }
        }
        return sanitized;
    });
}
