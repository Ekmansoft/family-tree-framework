/**
 * Tree filtering utilities
 * Filters families and individuals based on maxNumberOfTrees setting
 */

export interface TreeFilterParams {
    individuals: any[];
    families: any[];
    maxNumberOfTrees: number;
}

export interface TreeFilterResult {
    individualsLocal: any[];
    familiesLocal: any[];
}

/**
 * Filters trees by selecting the first N root families and their descendants
 * Root families are those whose parents are not children in any other family
 */
export function filterByMaxTrees(params: TreeFilterParams): TreeFilterResult {
    const { individuals, families, maxNumberOfTrees } = params;
    
    let familiesLocal = families;
    let individualsLocal = individuals;
    
    if (typeof maxNumberOfTrees === 'number' && isFinite(maxNumberOfTrees)) {
        const take = Math.max(0, Math.floor(maxNumberOfTrees));
        if (take > 0 && families.length > 0) {
            // Find root families: families whose parents are not children in any family
            const parentIsChild = new Set<string>();
            families.forEach((f: any) => { 
                (f.children || []).forEach((c: string) => parentIsChild.add(c)); 
            });
            
            const rootFamiliesOrdered = families.filter((f: any) => {
                const parents: string[] = (f.parents || []).slice();
                return !parents.some((p: string) => parentIsChild.has(p));
            });

            const selectedRoots = rootFamiliesOrdered.slice(0, take);
            if (selectedRoots.length > 0) {
                // Collect descendant families starting from each selected root
                const allowedFamilies = new Set<string>();
                const stack: string[] = selectedRoots.map((f: any) => f.id);
                
                while (stack.length) {
                    const fid = stack.pop()!;
                    if (allowedFamilies.has(fid)) continue;
                    allowedFamilies.add(fid);
                    
                    const fam = families.find((f: any) => f.id === fid);
                    if (!fam) continue;
                    
                    (fam.children || []).forEach((childId: string) => {
                        const childFam = families.find((f: any) => (f.parents || []).includes(childId));
                        if (childFam && !allowedFamilies.has(childFam.id)) {
                            stack.push(childFam.id);
                        }
                    });
                }
                
                familiesLocal = families.filter((f: any) => allowedFamilies.has(f.id));
                
                const allowedIndividuals = new Set<string>();
                familiesLocal.forEach((f: any) => { 
                    (f.parents || []).forEach((p: string) => allowedIndividuals.add(p)); 
                    (f.children || []).forEach((c: string) => allowedIndividuals.add(c)); 
                });
                
                individualsLocal = individuals.filter((i: any) => allowedIndividuals.has(i.id));
            }
        }
    }
    
    return { individualsLocal, familiesLocal };
}

/**
 * Rebuilds child/parent relationship maps from filtered families
 */
export function buildRelationshipMaps(familiesLocal: any[]): {
    childrenOf: Map<string, string[]>;
    parentsOf: Map<string, string[]>;
} {
    const childrenOf = new Map<string, string[]>();
    const parentsOf = new Map<string, string[]>();
    
    familiesLocal.forEach((fam: any) => {
        const kids: string[] = (fam.children || []).map((c: string) => c);
        const parents: string[] = (fam.parents || []).slice();
        
        parents.forEach((p: string) => {
            if (!childrenOf.has(p)) childrenOf.set(p, []);
            childrenOf.get(p)!.push(...kids);
        });
        
        kids.forEach((c: string) => {
            if (!parentsOf.has(c)) parentsOf.set(c, []);
            parentsOf.get(c)!.push(...parents);
        });
    });
    
    return { childrenOf, parentsOf };
}
