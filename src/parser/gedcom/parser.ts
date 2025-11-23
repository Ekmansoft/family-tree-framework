export function parseGedcom(gedcomText: string): { individuals: any[]; families: any[] } {
    const lines: string[] = gedcomText.split('\n');
    const individuals: any[] = [];
    const families: any[] = [];
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

    return { individuals, families };
}