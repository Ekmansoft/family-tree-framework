// Parse GEDCOM date strings into a structured form useful for age calculations.
// Examples of GEDCOM date formats: "12 JAN 1900", "JAN 1900", "1900".
// Exported for testing purposes.
export const parseGedcomDate = (raw: string | null | undefined) => {
    const result: any = { original: raw || null, year: null, month: null, day: null, precision: 'unknown', iso: null, approxIso: null };
    if (!raw) return result;
    const s = String(raw).trim();
    if (!s) return result;

    // normalize separators and collapse spaces
    const toks = s.replace(/\s+/g, ' ').split(' ');
    // month mapping
    const months: Record<string, number> = {
        JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
        JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
    };

    // Try patterns: D MON YYYY | MON YYYY | YYYY
    if (toks.length === 3) {
        const [a, b, c] = toks;
        const day = parseInt(a, 10);
        const mon = months[b.toUpperCase()];
        const year = parseInt(c, 10);
        if (!Number.isNaN(day) && mon && !Number.isNaN(year)) {
            result.day = day;
            result.month = mon;
            result.year = year;
            result.precision = 'day';
        }
    }
    if (result.precision === 'unknown' && toks.length === 2) {
        const [a, b] = toks;
        const mon = months[a.toUpperCase()];
        const year = parseInt(b, 10);
        if (mon && !Number.isNaN(year)) {
            result.month = mon;
            result.year = year;
            result.precision = 'month';
        }
    }
    if (result.precision === 'unknown' && toks.length === 1) {
        const y = parseInt(toks[0], 10);
        if (!Number.isNaN(y)) {
            result.year = y;
            result.precision = 'year';
        }
    }

    // Build ISO-ish strings for convenience: iso when fully specified; approxIso uses defaults
    if (result.year !== null) {
        const mm = result.month ? String(result.month).padStart(2, '0') : '01';
        const dd = result.day ? String(result.day).padStart(2, '0') : '01';
        try {
            result.approxIso = `${String(result.year).padStart(4, '0')}-${mm}-${dd}`;
            if (result.precision === 'day') {
                result.iso = result.approxIso;
            } else {
                result.iso = null;
            }
        } catch (e) {
            result.iso = null;
            result.approxIso = null;
        }
    }
    return result;
};

import { parseGedcomLine, debugLog } from './utils/lineParsing';
import { handleIndividualTag, startIndividualRecord } from './utils/individualHandlers';
import { handleFamilyTag, startFamilyRecord } from './utils/familyHandlers';
import { linkFamilyReferences, scanForMissingFamilies } from './utils/familyLinking';
import { validateReferences } from './utils/validation';
import type { ValidationError } from './utils/validation';

export type { ValidationError } from './utils/validation';

export function parseGedcom(gedcomText: string): { individuals: any[]; families: any[]; validationErrors: ValidationError[] } {
    const lines: string[] = gedcomText.split('\n');
    const individuals: any[] = [];
    const families: any[] = [];
    let currentIndividual: any = null;
    let currentFamily: any = null;
    let skipUntilLine = -1;

    lines.forEach((line, index) => {
        // Skip lines if we've already processed them (e.g., lookahead for dates)
        if (index <= skipUntilLine) return;
        
        // Log each line for traceability
        debugLog(`parseGedcom line ${index + 1}:`, line);

        const { level, tag, value, recordId } = parseGedcomLine(line);

        if (level === '0') {
            if (tag === 'INDI') {
                currentIndividual = startIndividualRecord(recordId, value, currentIndividual, individuals);
                currentFamily = null;
                
            } else if (tag === 'FAM') {
                currentFamily = startFamilyRecord(recordId, value, currentIndividual, currentFamily, individuals, families);
                currentIndividual = null;
                
            } else {
                // Reset current records on new top-level record
                if (currentIndividual) {
                    debugLog('parseGedcom: pushing individual (other record)', currentIndividual.id || '(no id)');
                    individuals.push(currentIndividual);
                    currentIndividual = null;
                }
                if (currentFamily) {
                    families.push(currentFamily);
                    currentFamily = null;
                }
            }
        } else if (level === '1') {
            if (currentIndividual) {
                const skip = handleIndividualTag(tag, value, currentIndividual, lines, index);
                if (skip > 0) {
                    skipUntilLine = index + skip;
                }
            } else if (currentFamily) {
                handleFamilyTag(tag, value, currentFamily);
            }
        }
    });

    // Push final records
    if (currentIndividual) {
        debugLog('parseGedcom: pushing final individual', currentIndividual.id || '(no id)');
        individuals.push(currentIndividual);
    }
    if (currentFamily) {
        debugLog('parseGedcom: pushing final family', currentFamily.id || '(no id)');
        families.push(currentFamily);
    }

    // Fallback: scan for families that might have been missed
    if (families.length === 0) {
        const fallbackFamilies = scanForMissingFamilies(lines, families);
        families.push(...fallbackFamilies);
    }

    // Link family references
    linkFamilyReferences(individuals, families);

    // Debug logs to help trace missing individuals
    debugLog('parseGedcom: individuals ids =>', individuals.map(i => i.id));
    debugLog('parseGedcom: families =>', families.map(f => ({ id: f.id, children: f.children, parents: f.parents })));

    // Validation pass: Remove references to non-existent individuals/families
    const validationErrors = validateReferences(individuals, families);

    return { individuals, families, validationErrors };
}
