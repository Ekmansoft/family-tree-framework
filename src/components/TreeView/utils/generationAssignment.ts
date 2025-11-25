/**
 * Generation assignment utilities for tree layout
 * Assigns generation levels to individuals based on parent-child relationships
 */

export interface GenerationAssignmentResult {
    levelOf: Map<string, number>;
    minLevel: number;
    maxLevel: number;
    levels: Map<number, string[]>;
}

export interface GenerationAssignmentParams {
    individualsLocal: any[];
    familiesLocal: any[];
    childrenOf: Map<string, string[]>;
    parentsOf: Map<string, string[]>;
    individualsById: Map<string, any>;
    focusItem: string | null;
}

/**
 * Assigns generation levels to all individuals using BFS from starting individuals
 * Returns levelOf map, min/max levels, and individuals grouped by level
 */
export function assignGenerations(params: GenerationAssignmentParams): GenerationAssignmentResult {
    const { individualsLocal, familiesLocal, childrenOf, parentsOf, individualsById, focusItem } = params;

    // Determine starting individuals (roots) for generation assignment.
    // If `focusItem` is provided and matches an individual id, start from that individual.
    // If it matches a family id, start from that family's parents (or children if no parents).
    // Otherwise, default to individuals without parents.
    const startingIndividuals: string[] = (() => {
        if (focusItem) {
            if (individualsById.has(focusItem)) return [focusItem];
            const fam = familiesLocal.find((f: any) => f.id === focusItem);
            if (fam) {
                const parents = (fam.parents || []).slice().filter((p: string) => individualsById.has(p));
                if (parents.length > 0) return parents;
                const kids = (fam.children || []).slice().filter((k: string) => individualsById.has(k));
                if (kids.length > 0) return kids;
            }
        }
        const roots = individualsLocal.filter((i) => !parentsOf.has(i.id)).map((i) => i.id);
        // If no roots found, use all available individuals (failsafe)
        return roots.length > 0 ? roots : individualsLocal.slice(0, 1).map(i => i.id);
    })();

    // BFS to assign generation levels starting from `startingIndividuals`
    const levelOf = new Map<string, number>();
    const queue: string[] = [];
    startingIndividuals.forEach((r) => {
        levelOf.set(r, 0);
        queue.push(r);
    });

    // Forward BFS (descendants - positive generations)
    while (queue.length > 0) {
        const id = queue.shift()!;
        const lvl = levelOf.get(id) ?? 0;
        const kids = childrenOf.get(id) || [];
        kids.forEach((kid) => {
            const existing = levelOf.get(kid);
            const wanted = lvl + 1;
            if (existing === undefined || wanted < existing) {
                levelOf.set(kid, wanted);
                queue.push(kid);
            }
        });
    }

    // Backward BFS (ancestors - negative generations)
    const backQueue: string[] = [];
    startingIndividuals.forEach((r) => {
        backQueue.push(r);
    });

    while (backQueue.length > 0) {
        const id = backQueue.shift()!;
        const lvl = levelOf.get(id) ?? 0;
        const parents = parentsOf.get(id) || [];
        parents.forEach((parent) => {
            const existing = levelOf.get(parent);
            const wanted = lvl - 1;
            if (existing === undefined || wanted > existing) {
                levelOf.set(parent, wanted);
                backQueue.push(parent);
            }
        });
    }

    // Any individuals not reached (cycles or disconnected) -> put at level 0
    individualsLocal.forEach((i) => {
        if (!levelOf.has(i.id)) levelOf.set(i.id, 0);
    });

    // Propagate levels between spouses/parents and children so spouses are placed on the same generation
    // and children are placed one generation below. Iterate until fixed point (small number of passes).
    for (let iter = 0; iter < 8; iter++) {
        let changed = false;
        familiesLocal.forEach((fam: any) => {
            const parents: string[] = (fam.parents || []).slice();
            const kids: string[] = (fam.children || []).slice();

            // If any parent has a level, set all parents to the maximum level (deepest generation)
            // This ensures spouses who marry into the family adopt the correct generation
            const parentLevels = parents.map((p) => levelOf.get(p)).filter((v): v is number => typeof v === 'number');
            if (parentLevels.length > 0) {
                const target = Math.max(...parentLevels);
                parents.forEach((p) => {
                    const cur = levelOf.get(p);
                    if (cur === undefined || cur !== target) {
                        levelOf.set(p, target);
                        changed = true;
                    }
                });
                // Ensure children are at target+1
                kids.forEach((c) => {
                    const cur = levelOf.get(c);
                    const want = target + 1;
                    if (cur === undefined || cur < want) {
                        levelOf.set(c, want);
                        changed = true;
                    }
                });
            }

            // If any child has a level, ensure parents are one generation above
            const childLevels = kids.map((c) => levelOf.get(c)).filter((v): v is number => typeof v === 'number');
            if (childLevels.length > 0) {
                const wantParentLevel = Math.min(...childLevels) - 1;
                parents.forEach((p) => {
                    const cur = levelOf.get(p);
                    if (cur === undefined || cur !== wantParentLevel) {
                        levelOf.set(p, wantParentLevel);
                        changed = true;
                    }
                });
            }
        });
        if (!changed) break;
    }

    // Force spouses to adopt generation of a partner who is a child in another family.
    // Build map: individual -> parentFamilyId (if they are a child in some family)
    const childParentFamily = new Map<string, string>();
    familiesLocal.forEach((f: any) => {
        (f.children || []).forEach((c: string) => childParentFamily.set(c, f.id));
    });

    familiesLocal.forEach((fam: any) => {
        const parents: string[] = (fam.parents || []).slice();
        // If any parent is a child in another family, adopt that parent's generation for all parents
        const childParent = parents.find((p) => childParentFamily.has(p));
        if (childParent) {
            const targetLevel = levelOf.get(childParent as string);
            if (typeof targetLevel === 'number') {
                parents.forEach((p) => {
                    levelOf.set(p, targetLevel);
                });
            }
        }
    });

    // Debug: log level assignments
    if (typeof window !== 'undefined' && (window as any).DEBUG_TREE) {
        console.log('Level assignments:');
        levelOf.forEach((lvl, id) => {
            const ind = individualsById.get(id);
            console.log(`  ${id} (${ind?.name || '?'}): level ${lvl}`);
        });
    }

    // Group by level
    const levels = new Map<number, string[]>();
    let minLevel = 0;
    let maxLevel = 0;
    levelOf.forEach((lvl, id) => {
        if (!levels.has(lvl)) levels.set(lvl, []);
        levels.get(lvl)!.push(id);
        if (lvl < minLevel) minLevel = lvl;
        if (lvl > maxLevel) maxLevel = lvl;
    });

    return { levelOf, minLevel, maxLevel, levels };
}
