/**
 * Utilities for parsing individual GEDCOM lines
 */

export interface ParsedLine {
    level: string;
    tag: string;
    value: string;
    recordId: string | null;
}

/**
 * Normalize GEDCOM ID by stripping @ symbols
 */
export const normalizeId = (s: string | undefined | null): string | null | undefined => {
    if (!s) return s;
    return s.trim().replace(/^@|@$/g, '');
};

/**
 * Parse a GEDCOM line into its components
 * Handles both formats:
 * - 0 @I1@ INDI (recordId in parts[1], tag in parts[2])
 * - 1 NAME John /Doe/ (tag in parts[1], value in parts[2+])
 */
export const parseGedcomLine = (line: string): ParsedLine => {
    const parts = line.trim().split(' ');
    const level = parts[0];
    
    let tag = parts[1] || '';
    let value = parts.slice(2).join(' ');
    let recordId: string | null = null;
    
    // Handle lines like: 0 @I1@ INDI  (ID in parts[1], tag in parts[2])
    if (parts.length >= 3 && parts[1].startsWith('@') && parts[2]) {
        recordId = parts[1];
        tag = parts[2];
        value = parts.slice(3).join(' ');
    }
    
    return { level, tag, value, recordId };
};

/**
 * Debug logger that safely handles console availability
 */
export const debugLog = (message: string, ...args: any[]): void => {
    try {
        // eslint-disable-next-line no-console
        console.debug(message, ...args);
    } catch (e) {
        // Ignore logging errors in non-browser environments
    }
};
