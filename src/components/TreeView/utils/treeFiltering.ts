/**
 * Tree filtering utilities
 * Filters families and individuals to the largest connected tree component
 */

export interface TreeFilterParams {
    individuals: any[];
    families: any[];
}

export interface TreeFilterResult {
    individualsLocal: any[];
    familiesLocal: any[];
}

/**
 * Filters trees by selecting the largest connected component (by family count)
 * Root families are those whose parents are not children in any other family
 */
export function filterByMaxTrees(params: TreeFilterParams): TreeFilterResult {
    const { individuals, families } = params;
    
    if (families.length === 0) {
        return { individualsLocal: individuals, familiesLocal: families };
    }
    
    // Find root families: families whose parents are not children in any family
    const parentIsChild = new Set<string>();
    families.forEach((f: any) => { 
        (f.children || []).forEach((c: string) => parentIsChild.add(c)); 
    });
    
    const rootFamiliesOrdered = families.filter((f: any) => {
        const parents: string[] = (f.parents || []).slice();
        return !parents.some((p: string) => parentIsChild.has(p));
    });

    if (rootFamiliesOrdered.length === 0) {
        return { individualsLocal: individuals, familiesLocal: families };
    }

    // Find the largest connected component by exploring from each root
    let largestComponent: Set<string> = new Set();
    let largestSize = 0;

    rootFamiliesOrdered.forEach((rootFamily: any) => {
        const componentFamilies = new Set<string>();
        const stack: string[] = [rootFamily.id];
        
        while (stack.length) {
            const fid = stack.pop()!;
            if (componentFamilies.has(fid)) continue;
            componentFamilies.add(fid);
            
            const fam = families.find((f: any) => f.id === fid);
            if (!fam) continue;
            
            (fam.children || []).forEach((childId: string) => {
                const childFam = families.find((f: any) => (f.parents || []).includes(childId));
                if (childFam && !componentFamilies.has(childFam.id)) {
                    stack.push(childFam.id);
                }
            });
        }
        
        if (componentFamilies.size > largestSize) {
            largestSize = componentFamilies.size;
            largestComponent = componentFamilies;
        }
    });

    if (largestComponent.size === 0) {
        return { individualsLocal: individuals, familiesLocal: families };
    }
    
    const familiesLocal = families.filter((f: any) => largestComponent.has(f.id));
    
    const allowedIndividuals = new Set<string>();
    familiesLocal.forEach((f: any) => { 
        (f.parents || []).forEach((p: string) => allowedIndividuals.add(p)); 
        (f.children || []).forEach((c: string) => allowedIndividuals.add(c)); 
    });
    
    const individualsLocal = individuals.filter((i: any) => allowedIndividuals.has(i.id));
    
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
