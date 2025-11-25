/**
 * Filter individuals and families based on focusItem.
 * Performs BFS forward (descendants) and backward (ancestors) to find all connected families.
 */
export function filterTreeByFocus(
    focusItem: string,
    individuals: any[],
    families: any[]
): { individuals: any[]; families: any[] } {
    const famMap = new Map(families.map(f => [f.id, f]));
    const allowedFams = new Set<string>();
    const stack: string[] = [];

    // Check if focusItem is a family ID
    const focusFamily = famMap.get(focusItem);

    if (focusFamily) {
        // focusItem is a family - start from this family
        allowedFams.add(focusItem);
        stack.push(focusItem);
    } else {
        // focusItem is an individual - find families containing this person
        families.forEach((f) => {
            if ((f.parents || []).includes(focusItem) || (f.children || []).includes(focusItem)) {
                allowedFams.add(f.id);
                stack.push(f.id);
            }
        });
    }

    // Build person->families indexes for fast lookup
    const personAsParent = new Map<string, string[]>();
    const personAsChild = new Map<string, string[]>();
    families.forEach((f) => {
        (f.parents || []).forEach((p: string) => {
            if (!personAsParent.has(p)) personAsParent.set(p, []);
            personAsParent.get(p)!.push(f.id);
        });
        (f.children || []).forEach((c: string) => {
            if (!personAsChild.has(c)) personAsChild.set(c, []);
            personAsChild.get(c)!.push(f.id);
        });
    });

    // BFS forward to find all reachable families (descendants)
    while (stack.length) {
        const fid = stack.pop()!;
        const fam = famMap.get(fid);
        if (!fam) continue;
        (fam.children || []).forEach((childId: string) => {
            const childFams = personAsParent.get(childId) || [];
            childFams.forEach((cfid) => {
                if (!allowedFams.has(cfid)) {
                    allowedFams.add(cfid);
                    stack.push(cfid);
                }
            });
        });
    }

    // BFS backward to find parent families (ancestors)
    const backStack: string[] = [];

    if (focusFamily) {
        // focusItem is a family - start backward from its parents
        (focusFamily.parents || []).forEach((parentId: string) => {
            families.forEach((pf) => {
                if ((pf.children || []).includes(parentId)) {
                    if (!allowedFams.has(pf.id)) {
                        allowedFams.add(pf.id);
                        backStack.push(pf.id);
                    }
                }
            });
        });
    } else {
        // focusItem is an individual - start with families where focusItem is a child OR parent
        families.forEach((f) => {
            if ((f.children || []).includes(focusItem) || (f.parents || []).includes(focusItem)) {
                if (!allowedFams.has(f.id)) {
                    allowedFams.add(f.id);
                    backStack.push(f.id);
                }
            }
        });
    }

    while (backStack.length) {
        const fid = backStack.pop()!;
        const fam = famMap.get(fid);
        if (!fam) continue;
        (fam.parents || []).forEach((parentId: string) => {
            families.forEach((pf) => {
                if ((pf.children || []).includes(parentId)) {
                    if (!allowedFams.has(pf.id)) {
                        allowedFams.add(pf.id);
                        backStack.push(pf.id);
                    }
                }
            });
        });
    }

    const filteredIndividuals = new Set<string>();
    allowedFams.forEach((fid) => {
        const f = famMap.get(fid);
        if (!f) return;
        (f.parents || []).forEach((p: string) => filteredIndividuals.add(p));
        (f.children || []).forEach((c: string) => filteredIndividuals.add(c));
    });
    filteredIndividuals.add(focusItem);

    return {
        individuals: individuals.filter((ind) => filteredIndividuals.has(ind.id)),
        families: families.filter((f) => allowedFams.has(f.id))
    };
}
