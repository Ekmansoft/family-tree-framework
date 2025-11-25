/**
 * Tree filtering utilities
 * Discovers all connected tree components and allows filtering by selected tree index
 */

export interface TreeComponent {
    rootFamilyId: string;
    familyIds: Set<string>;
    individualCount: number;
    familyCount: number;
}

export interface TreeFilterParams {
    individuals: any[];
    families: any[];
    selectedTreeIndex?: number; // Which tree to show (0 = largest, 1 = second largest, etc.)
    focusItemId?: string | null; // Person or family ID - will auto-detect which tree it belongs to
}

export interface TreeFilterResult {
    individualsLocal: any[];
    familiesLocal: any[];
}

/**
 * Discovers all connected tree components in the dataset
 */
export function discoverTreeComponents(individuals: any[], families: any[]): TreeComponent[] {
    if (families.length === 0) {
        return [];
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
        return [];
    }

    // Find all connected components
    const components: TreeComponent[] = [];
    const processedFamilies = new Set<string>();

    rootFamiliesOrdered.forEach((rootFamily: any) => {
        if (processedFamilies.has(rootFamily.id)) return;
        
        const componentFamilies = new Set<string>();
        const stack: string[] = [rootFamily.id];
        
        while (stack.length) {
            const fid = stack.pop()!;
            if (componentFamilies.has(fid)) continue;
            componentFamilies.add(fid);
            processedFamilies.add(fid);
            
            const fam = families.find((f: any) => f.id === fid);
            if (!fam) continue;
            
            (fam.children || []).forEach((childId: string) => {
                const childFam = families.find((f: any) => (f.parents || []).includes(childId));
                if (childFam && !componentFamilies.has(childFam.id)) {
                    stack.push(childFam.id);
                }
            });
        }
        
        // Count unique individuals in this component
        const individualIds = new Set<string>();
        componentFamilies.forEach(fid => {
            const fam = families.find((f: any) => f.id === fid);
            if (fam) {
                (fam.parents || []).forEach((p: string) => individualIds.add(p));
                (fam.children || []).forEach((c: string) => individualIds.add(c));
            }
        });
        
        components.push({
            rootFamilyId: rootFamily.id,
            familyIds: componentFamilies,
            familyCount: componentFamilies.size,
            individualCount: individualIds.size
        });
    });

    // Sort by size (largest first)
    components.sort((a, b) => b.familyCount - a.familyCount);
    
    return components;
}

/**
 * Filters to a specific tree component by person/family ID or by index
 */
export function filterByMaxTrees(params: TreeFilterParams): TreeFilterResult {
    const { individuals, families, selectedTreeIndex, focusItemId } = params;
    
    if (families.length === 0) {
        return { individualsLocal: individuals, familiesLocal: families };
    }
    
    const components = discoverTreeComponents(individuals, families);
    
    if (components.length === 0) {
        return { individualsLocal: individuals, familiesLocal: families };
    }
    
    let selectedComponent: TreeComponent | undefined;
    
    // If focusItemId is provided, find which tree component it belongs to
    if (focusItemId) {
        selectedComponent = components.find(comp => {
            // Check if it's a family ID
            if (comp.familyIds.has(focusItemId)) {
                return true;
            }
            // Check if it's an individual ID - search in families
            for (const fid of comp.familyIds) {
                const fam = families.find((f: any) => f.id === fid);
                if (fam) {
                    if ((fam.parents || []).includes(focusItemId) || 
                        (fam.children || []).includes(focusItemId)) {
                        return true;
                    }
                }
            }
            return false;
        });
    }
    
    // If no focusItemId or not found, use selectedTreeIndex
    if (!selectedComponent) {
        const index = selectedTreeIndex !== undefined ? selectedTreeIndex : 0;
        selectedComponent = components[Math.min(index, components.length - 1)];
    }
    
    const familiesLocal = families.filter((f: any) => selectedComponent!.familyIds.has(f.id));
    
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
