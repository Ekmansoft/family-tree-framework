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

export interface ValidationError {
    type: 'invalid_family_reference' | 'invalid_parent_reference' | 'invalid_child_reference';
    message: string;
    entityId: string; // ID of the individual or family with the error
    referenceId: string; // ID that was invalid
}

export function parseGedcom(gedcomText: string): { individuals: any[]; families: any[]; validationErrors: ValidationError[] } {
    const lines: string[] = gedcomText.split('\n');
    const individuals: any[] = [];
    const families: any[] = [];
    const validationErrors: ValidationError[] = [];
    let currentIndividual: any = null;
    let currentFamily: any = null;

    const normalizeId = (s: string | undefined | null) => {
        if (!s) return s;
        return s.trim().replace(/^@|@$/g, '');
    };

    lines.forEach((line, index) => {
        // Log each line for traceability
        try {
            // eslint-disable-next-line no-console
            console.debug(`parseGedcom line ${index + 1}: ${line}`);
        } catch (e) {}

        const parts = line.trim().split(' ');
        const level = parts[0];

        // Handle lines like: 0 @I1@ INDI  (ID in parts[1], tag in parts[2])
        let tag = parts[1];
        let value = parts.slice(2).join(' ');
        let recordId: string | null = null;
        if (parts.length >= 3 && parts[1].startsWith('@') && parts[2]) {
            recordId = parts[1];
            tag = parts[2];
            value = parts.slice(3).join(' ');
        }

        if (level === '0') {
            if (tag === 'INDI') {
                if (currentIndividual) {
                    try {
                        // eslint-disable-next-line no-console
                        console.debug('parseGedcom: pushing individual', currentIndividual.id || '(no id)');
                    } catch (e) {}
                    individuals.push(currentIndividual);
                }
                currentIndividual = { id: normalizeId(recordId || value), families: [] };
                try {
                    // eslint-disable-next-line no-console
                    console.debug('parseGedcom: created individual', currentIndividual.id);
                } catch (e) {}
                currentFamily = null;
            } else if (tag === 'FAM') {
                // If we are starting a family record but have an open individual, push it first
                if (currentIndividual) {
                    try {
                        // eslint-disable-next-line no-console
                        console.debug('parseGedcom: pushing (before FAM) individual', currentIndividual.id || '(no id)');
                    } catch (e) {}
                    individuals.push(currentIndividual);
                    currentIndividual = null;
                }
                if (currentFamily) {
                    families.push(currentFamily);
                }
                currentFamily = { id: normalizeId(recordId || value), parents: [], children: [] };
                try {
                    // eslint-disable-next-line no-console
                    console.debug('parseGedcom: created family', currentFamily.id);
                } catch (e) {}
            } else {
                // reset current records on new top-level record
                if (currentIndividual) {
                    try {
                        // eslint-disable-next-line no-console
                        console.debug('parseGedcom: pushing individual (other record)', currentIndividual.id || '(no id)');
                    } catch (e) {}
                    individuals.push(currentIndividual);
                    currentIndividual = null;
                }
                if (currentFamily) {
                    families.push(currentFamily);
                    currentFamily = null;
                }
            }
            } else if (level === '1') {
            if (tag === 'NAME' && currentIndividual) {
                    // Normalize GEDCOM NAME fields which often include slashes around the surname
                    const cleanName = value.replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ').trim();
                    currentIndividual.name = cleanName;
                    try {
                        // eslint-disable-next-line no-console
                        console.debug('parseGedcom: set NAME for', currentIndividual.id, '=>', cleanName);
                    } catch (e) {}
                } else if (tag === 'SEX' && currentIndividual) {
                    currentIndividual.gender = value.trim();
                    try {
                        // eslint-disable-next-line no-console
                        console.debug('parseGedcom: set SEX for', currentIndividual.id, '=>', currentIndividual.gender);
                    } catch (e) {}
                } else if ((tag === 'BIRT' || tag === 'DEAT') && currentIndividual) {
                    // Birth/Death event: the actual date is commonly on a level-2 DATE line
                    // but there can be intervening level-2 metadata (e.g. _UID, RIN, PLAC).
                    // Scan forward for the first level-2 DATE until we hit the next level-1/0 record.
                    let dateVal = value && value.trim() ? value.trim() : null;
                    if (!dateVal) {
                        for (let k = index + 1; k < lines.length; k++) {
                            const nl = lines[k].trim();
                            if (!nl) continue;
                            const np = nl.split(' ');
                            const nlevel = np[0];
                            // stop scanning if we hit a sibling or parent record
                            if (nlevel === '0' || nlevel === '1') break;
                            if (nlevel === '2' && np[1] === 'DATE') {
                                dateVal = np.slice(2).join(' ').trim();
                                break;
                            }
                        }
                    }
                    if (dateVal) {
                        const parsed = parseGedcomDate(dateVal);
                        if (tag === 'BIRT') {
                            currentIndividual.birthDate = parsed;
                            try {
                                // eslint-disable-next-line no-console
                                console.debug('parseGedcom: set BIRT for', currentIndividual.id, '=>', parsed);
                            } catch (e) {}
                        } else {
                            currentIndividual.deathDate = parsed;
                            try {
                                // eslint-disable-next-line no-console
                                console.debug('parseGedcom: set DEAT for', currentIndividual.id, '=>', parsed);
                            } catch (e) {}
                        }
                    }
                } else if (tag === 'FAMS' && currentIndividual) {
                currentIndividual.families.push(normalizeId(value));
            } else if (tag === 'CHIL' && currentFamily) {
                currentFamily.children.push(normalizeId(value));
            } else if ((tag === 'HUSB' || tag === 'WIFE') && currentFamily) {
                currentFamily.parents = currentFamily.parents || [];
                currentFamily.parents.push(normalizeId(value));
            }
        }
    });

    if (currentIndividual) {
        individuals.push(currentIndividual);
    }
    if (currentFamily) {
        families.push(currentFamily);
    }

    // Link families back into individuals' `families` arrays so each person knows which families they belong to.
    families.forEach((fam) => {
        const fid = fam.id;
        try {
            // parents array (husband/wife or others)
            (fam.parents || []).forEach((pid: string) => {
                if (pid) {
                    const ind = individuals.find((i) => i.id === pid);
                    if (ind) {
                        ind.families = ind.families || [];
                        if (!ind.families.includes(fid)) ind.families.push(fid);
                        // eslint-disable-next-line no-console
                        console.debug('parseGedcom: linked', ind.id, 'to family', fid);
                    } else {
                        // eslint-disable-next-line no-console
                        console.debug('parseGedcom: could not find individual', pid, 'to link to family', fid);
                    }
                }
            });

            // children
            (fam.children || []).forEach((cid: string) => {
                const ind = individuals.find((i) => i.id === cid);
                if (ind) {
                    ind.families = ind.families || [];
                    if (!ind.families.includes(fid)) ind.families.push(fid);
                    // eslint-disable-next-line no-console
                    console.debug('parseGedcom: linked child', ind.id, 'to family', fid);
                } else {
                    // eslint-disable-next-line no-console
                    console.debug('parseGedcom: could not find child individual', cid, 'for family', fid);
                }
            });
        } catch (e) {
            // ignore linking errors
        }
    });

    // Fallback: if no families were discovered by the main pass, try a conservative second pass
    // that scans for family headers `0 @F...@ FAM` and extracts HUSB/WIFE/CHIL lines.
    if (families.length === 0) {
        try {
            // eslint-disable-next-line no-console
            console.warn('parseGedcom: no families found in primary parse, running fallback family scan');
            for (let i = 0; i < lines.length; i++) {
                const l = lines[i].trim();
                const famHeaderMatch = l.match(/^0\s+@([^@]+)@\s+FAM\b/i);
                if (famHeaderMatch) {
                    const fid = famHeaderMatch[1];
                    const famObj: any = { id: fid, children: [] };
                    // scan subsequent level-1 lines until next level-0
                    for (let j = i + 1; j < lines.length; j++) {
                        const nl = lines[j].trim();
                        if (nl.startsWith('0 ')) break;
                        const parts = nl.split(' ');
                        const tag = parts[1];
                        const value = parts.slice(2).join(' ');
                        if (/^HUSB$/i.test(tag) || /^WIFE$/i.test(tag)) {
                            famObj.parents = famObj.parents || [];
                            famObj.parents.push(normalizeId(value));
                        }
                        if (/^CHIL$/i.test(tag)) {
                            famObj.children.push(normalizeId(value));
                        }
                    }
                    families.push(famObj);
                    // link to individuals
                    (famObj.parents || []).forEach((pid: string) => {
                        if (pid) {
                            const ind = individuals.find((ii) => ii.id === pid);
                            if (ind) {
                                ind.families = ind.families || [];
                                if (!ind.families.includes(fid)) ind.families.push(fid);
                            }
                        }
                    });
                    (famObj.children || []).forEach((cid: string) => {
                        const ind = individuals.find((ii) => ii.id === cid);
                        if (ind) {
                            ind.families = ind.families || [];
                            if (!ind.families.includes(fid)) ind.families.push(fid);
                        }
                    });
                }
            }
            // eslint-disable-next-line no-console
            console.debug('parseGedcom: fallback families =>', families.map((f) => f.id));
        } catch (e) {
            // ignore fallback errors
        }
    }

    // Debug logs to help trace missing individuals
    try {
        // eslint-disable-next-line no-console
        console.debug('parseGedcom: individuals ids =>', individuals.map(i => i.id));
        // eslint-disable-next-line no-console
        console.debug('parseGedcom: families =>', families.map(f => ({ id: f.id, children: f.children, parents: f.parents })));
    } catch (e) {
        // ignore logging errors in non-browser environments
    }

    // Validation pass: Remove references to non-existent individuals from families
    // This handles corrupt GEDCOM files that reference individuals that don't exist
    const validIndividualIds = new Set(individuals.map(i => i.id));
    const validFamilyIds = new Set(families.map(f => f.id));
    let invalidRefsRemoved = 0;
    
    // Validate family references in individuals
    individuals.forEach(ind => {
        const originalFamilies = ind.families || [];
        ind.families = originalFamilies.filter((fid: string) => {
            if (!validFamilyIds.has(fid)) {
                invalidRefsRemoved++;
                validationErrors.push({
                    type: 'invalid_family_reference',
                    message: `Individual ${ind.id} references non-existent family ${fid}`,
                    entityId: ind.id,
                    referenceId: fid
                });
                try {
                    // eslint-disable-next-line no-console
                    console.warn(`parseGedcom: Removed invalid family reference "${fid}" from individual ${ind.id}`);
                } catch (e) {}
                return false;
            }
            return true;
        });
    });
    
    // Validate individual references in families
    families.forEach(fam => {
        const originalParents = fam.parents || [];
        const originalChildren = fam.children || [];
        
        // Filter out invalid parent references
        fam.parents = originalParents.filter((pid: string) => {
            if (!validIndividualIds.has(pid)) {
                invalidRefsRemoved++;
                validationErrors.push({
                    type: 'invalid_parent_reference',
                    message: `Family ${fam.id} references non-existent parent ${pid}`,
                    entityId: fam.id,
                    referenceId: pid
                });
                try {
                    // eslint-disable-next-line no-console
                    console.warn(`parseGedcom: Removed invalid parent reference "${pid}" from family ${fam.id}`);
                } catch (e) {}
                return false;
            }
            return true;
        });
        
        // Filter out invalid child references
        fam.children = originalChildren.filter((cid: string) => {
            if (!validIndividualIds.has(cid)) {
                invalidRefsRemoved++;
                validationErrors.push({
                    type: 'invalid_child_reference',
                    message: `Family ${fam.id} references non-existent child ${cid}`,
                    entityId: fam.id,
                    referenceId: cid
                });
                try {
                    // eslint-disable-next-line no-console
                    console.warn(`parseGedcom: Removed invalid child reference "${cid}" from family ${fam.id}`);
                } catch (e) {}
                return false;
            }
            return true;
        });
    });
    
    if (invalidRefsRemoved > 0) {
        try {
            // eslint-disable-next-line no-console
            console.warn(`parseGedcom: Removed ${invalidRefsRemoved} invalid references total`);
        } catch (e) {}
    }

    return { individuals, families, validationErrors };
}