/**
 * Handler functions for processing individual records
 */

import { debugLog, normalizeId } from './lineParsing';
import { parseGedcomDate } from '../parser';
import { findNextDateValue, normalizeGedcomName } from './dateUtils';

/**
 * Handle level-1 tags within an individual record (NAME, SEX, BIRT, DEAT, FAMS)
 */
export const handleIndividualTag = (
    tag: string,
    value: string,
    currentIndividual: any,
    lines: string[],
    currentIndex: number
): number => {
    let skipLines = 0;
    
    if (tag === 'NAME') {
        const cleanName = normalizeGedcomName(value);
        currentIndividual.name = cleanName;
        debugLog('parseGedcom: set NAME for', currentIndividual.id, '=>', cleanName);
        
    } else if (tag === 'SEX') {
        currentIndividual.gender = value.trim();
        debugLog('parseGedcom: set SEX for', currentIndividual.id, '=>', currentIndividual.gender);
        
    } else if (tag === 'BIRT' || tag === 'DEAT') {
        // Birth/Death event: the actual date is commonly on a level-2 DATE line
        let dateVal = value && value.trim() ? value.trim() : null;
        
        if (!dateVal) {
            const { dateValue, skipCount } = findNextDateValue(lines, currentIndex);
            dateVal = dateValue;
            skipLines = skipCount;
        }
        
        if (dateVal) {
            const parsed = parseGedcomDate(dateVal);
            if (tag === 'BIRT') {
                currentIndividual.birthDate = parsed;
                debugLog('parseGedcom: set BIRT for', currentIndividual.id, '=>', parsed);
            } else {
                currentIndividual.deathDate = parsed;
                debugLog('parseGedcom: set DEAT for', currentIndividual.id, '=>', parsed);
            }
        }
        
    } else if (tag === 'FAMS') {
        const fid = normalizeId(value);
        if (fid) {
            if (!currentIndividual.families) currentIndividual.families = [];
            if (!currentIndividual.families.includes(fid)) {
                currentIndividual.families.push(fid);
            }
        }
    }
    
    return skipLines;
};

/**
 * Start a new individual record
 */
export const startIndividualRecord = (
    recordId: string | null,
    value: string,
    currentIndividual: any,
    individuals: any[]
): any => {
    // Push current individual if exists
    if (currentIndividual) {
        debugLog('parseGedcom: pushing individual', currentIndividual.id || '(no id)');
        individuals.push(currentIndividual);
    }
    
    const newIndividual = { 
        id: normalizeId(recordId || value) || '', 
        families: [] 
    };
    debugLog('parseGedcom: created individual', newIndividual.id);
    
    return newIndividual;
};
