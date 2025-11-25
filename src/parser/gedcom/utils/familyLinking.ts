/**
 * Utilities for linking families and individuals
 */

import { debugLog, normalizeId } from './lineParsing';

/**
 * Link family references between individuals and families
 * Populates individual.families arrays based on family parent/child relationships
 */
export const linkFamilyReferences = (
    individuals: any[],
    families: any[]
): void => {
    const individualsById = new Map(individuals.map(ind => [ind.id, ind]));
    
    families.forEach((fam) => {
        const parents: string[] = (fam.parents || []).slice();
        const children: string[] = (fam.children || []).slice();
        
        // Link parents to this family
        parents.forEach((pid: string) => {
            const pind = individualsById.get(pid);
            if (pind) {
                if (!pind.families) pind.families = [];
                if (!pind.families.includes(fam.id)) {
                    pind.families.push(fam.id);
                }
                debugLog('parseGedcom: linked', pid, 'to family', fam.id);
            } else {
                debugLog('parseGedcom: could not find individual', pid, 'to link to family', fam.id);
            }
        });
        
        // Link children to this family
        children.forEach((cid: string) => {
            const cind = individualsById.get(cid);
            if (cind) {
                if (!cind.families) cind.families = [];
                if (!cind.families.includes(fam.id)) {
                    cind.families.push(fam.id);
                }
                debugLog('parseGedcom: linked child', cid, 'to family', fam.id);
            } else {
                debugLog('parseGedcom: could not find child individual', cid, 'for family', fam.id);
            }
        });
    });
};

/**
 * Fallback scanner to find families that might have been missed
 * Scans for FAM records that weren't parsed in the main loop
 */
export const scanForMissingFamilies = (
    lines: string[],
    families: any[]
): any[] => {
    const existingFamilyIds = new Set(families.map((f) => f.id));
    const fallbackFamilies: any[] = [];
    
    try {
        // eslint-disable-next-line no-console
        console.warn('parseGedcom: no families found in primary parse, running fallback family scan');
        
        for (let i = 0; i < lines.length; i++) {
            const l = lines[i].trim();
            const famHeaderMatch = l.match(/^0\s+@([^@]+)@\s+FAM\b/i);
            
            if (famHeaderMatch) {
                const fid = normalizeId(famHeaderMatch[1]);
                if (fid && !existingFamilyIds.has(fid)) {
                    const fallbackFam: any = { id: fid, parents: [], children: [] };
                    
                    // Scan subsequent lines for HUSB, WIFE, CHIL
                    for (let j = i + 1; j < lines.length; j++) {
                        const line2 = lines[j].trim();
                        const parts2 = line2.split(' ');
                        const lvl = parts2[0];
                        
                        if (lvl === '0') break; // next record
                        
                        if (lvl === '1') {
                            const tag2 = parts2[1];
                            const val2 = parts2.slice(2).join(' ');
                            
                            if (tag2 === 'HUSB' || tag2 === 'WIFE') {
                                const pid = normalizeId(val2);
                                if (pid && !fallbackFam.parents.includes(pid)) {
                                    fallbackFam.parents.push(pid);
                                }
                            } else if (tag2 === 'CHIL') {
                                const cid = normalizeId(val2);
                                if (cid && !fallbackFam.children.includes(cid)) {
                                    fallbackFam.children.push(cid);
                                }
                            }
                        }
                    }
                    fallbackFamilies.push(fallbackFam);
                }
            }
        }
        
        debugLog('parseGedcom: fallback families =>', fallbackFamilies.map((f) => f.id));
    } catch (e) {
        // ignore fallback errors
    }
    
    return fallbackFamilies;
};
