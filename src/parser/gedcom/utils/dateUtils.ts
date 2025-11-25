/**
 * Utilities for finding and parsing GEDCOM dates
 */

import { debugLog } from './lineParsing';

export interface DateSearchResult {
    dateValue: string | null;
    skipCount: number;
}

/**
 * Look ahead in lines to find the next DATE tag at level 2
 * Used for BIRT and DEAT events which have dates on separate lines
 */
export const findNextDateValue = (
    lines: string[],
    startIndex: number
): DateSearchResult => {
    let dateVal: string | null = null;
    let skipCount = 0;
    
    for (let j = startIndex + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        const nextParts = nextLine.split(' ');
        const nextLevel = nextParts[0];
        const nextTag = nextParts[1];
        
        if (nextLevel === '0' || nextLevel === '1') {
            // Hit next record or sibling tag, stop looking
            break;
        }
        
        if (nextLevel === '2' && nextTag === 'DATE') {
            dateVal = nextParts.slice(2).join(' ').trim();
            debugLog('parseGedcom: found DATE at level 2:', dateVal);
            skipCount = j - startIndex;
            break;
        }
    }
    
    return { dateValue: dateVal, skipCount };
};

/**
 * Normalize GEDCOM NAME fields which often include slashes around surname
 * Example: "John /Doe/" -> "John Doe"
 */
export const normalizeGedcomName = (value: string): string => {
    return value.replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ').trim();
};
