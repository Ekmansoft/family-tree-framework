/**
 * Handler functions for processing family records
 */

import { debugLog, normalizeId } from './lineParsing';
import { parseGedcomDate } from '../parser';

// Track the current level-1 tag for nested date parsing
let currentFamilyTag: string | null = null;

/**
 * Handle level-1 and level-2 tags within a family record (HUSB, WIFE, CHIL, MARR, DATE)
 */
export const handleFamilyTag = (
    tag: string,
    value: string,
    currentFamily: any,
    level: string = '1'
): void => {
    if (level === '1') {
        if (tag === 'HUSB' || tag === 'WIFE') {
            const pid = normalizeId(value);
            if (pid) {
                if (!currentFamily.parents) currentFamily.parents = [];
                if (!currentFamily.parents.includes(pid)) {
                    currentFamily.parents.push(pid);
                }
            }
        } else if (tag === 'CHIL') {
            const cid = normalizeId(value);
            if (cid) {
                if (!currentFamily.children) currentFamily.children = [];
                if (!currentFamily.children.includes(cid)) {
                    currentFamily.children.push(cid);
                }
            }
        } else if (tag === 'MARR') {
            // Track that we're in a MARR section for nested tags
            currentFamilyTag = 'MARR';
        }
    } else if (level === '2') {
        // Handle level-2 tags nested under level-1 tags
        if (currentFamilyTag === 'MARR' && tag === 'DATE') {
            currentFamily.marriageDate = parseGedcomDate(value);
            currentFamilyTag = null; // Reset after capturing date
        }
    }
};

/**
 * Start a new family record
 */
export const startFamilyRecord = (
    recordId: string | null,
    value: string,
    currentIndividual: any,
    currentFamily: any,
    individuals: any[],
    families: any[]
): any => {
    // Push current individual if exists
    if (currentIndividual) {
        debugLog('parseGedcom: pushing (before FAM) individual', currentIndividual.id || '(no id)');
        individuals.push(currentIndividual);
    }
    
    // Push current family if exists
    if (currentFamily) {
        families.push(currentFamily);
    }
    
    const newFamily = { 
        id: normalizeId(recordId || value) || '', 
        parents: [], 
        children: [] 
    };
    debugLog('parseGedcom: created family', newFamily.id);
    
    return newFamily;
};
