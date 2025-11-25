/**
 * Family width calculation utilities
 * Computes the required horizontal space for family subtrees
 */

export interface FamilyWidthParams {
    familiesLocal: any[];
    levelOf: Map<string, number>;
    personWidthMap: Map<string, number>;
    maxGenerationsForward: number;
    maxGenerationsBackward: number;
    singleWidth: number;
    siblingGap: number;
    parentGap: number;
    familyPadding: number;
}

/**
 * Computes required width for a family subtree (sum of child subtree widths or singleWidth)
 * Memoizes results to avoid redundant calculations
 */
export function createFamilyWidthCalculator(params: FamilyWidthParams) {
    const { familiesLocal, levelOf, personWidthMap, maxGenerationsForward, maxGenerationsBackward, singleWidth, siblingGap, parentGap, familyPadding } = params;
    
    const familyWidthMemo = new Map<string, number>();
    
    function computeFamilyWidth(famId: string, seen = new Set<string>()): number {
        if (familyWidthMemo.has(famId)) return familyWidthMemo.get(famId)!;
        if (seen.has(famId)) return singleWidth; // cycle guard
        seen.add(famId);
        
        const fam = familiesLocal.find((f: any) => f.id === famId);
        if (!fam) return singleWidth;
        
        const kids: string[] = (fam.children || []).slice();
        if (kids.length === 0) {
            // If no children, family width should at least cover parent widths
            const parents: string[] = (fam.parents || []).slice();
            const pWidths = parents.map((p: string) => personWidthMap.get(p) ?? singleWidth);
            const parentGapActual = parents.length > 1 ? 40 : 0;
            const w = Math.max(singleWidth, pWidths.reduce((s: number, v: number) => s + v, 0) + parentGapActual + 16);
            familyWidthMemo.set(famId, w);
            return w;
        }
        
        let total = 0;
        let visibleKids = 0;
        kids.forEach((kid: string) => {
            const kidLevel = levelOf.get(kid) ?? 0;
            if (kidLevel > (typeof maxGenerationsForward === 'number' ? maxGenerationsForward : Infinity) || 
                kidLevel < -(typeof maxGenerationsBackward === 'number' ? maxGenerationsBackward : Infinity)) {
                // skip descendants/ancestors beyond allowed generations
                return;
            }
            const childFam = familiesLocal.find((f: any) => (f.parents || []).includes(kid));
            if (childFam) {
                total += computeFamilyWidth(childFam.id, new Set(seen));
            } else {
                total += (personWidthMap.get(kid) ?? singleWidth);
            }
            visibleKids++;
        });
        
        // include sibling gaps roughly (use prop)
        const childrenWidth = Math.max(total + Math.max(0, visibleKids - 1) * siblingGap, 0);

        // compute parent block width as measured sum of parent boxes + gap (use prop)
        const parents: string[] = (fam.parents || []).slice();
        const pWidths = parents.map((p: string) => personWidthMap.get(p) ?? singleWidth);
        const parentBlockWidth = pWidths.reduce((s: number, v: number) => s + v, 0) + (parents.length > 0 ? parentGap : 0);

        const w = Math.max(childrenWidth, parentBlockWidth + familyPadding, singleWidth);
        familyWidthMemo.set(famId, w);
        return w;
    }
    
    return computeFamilyWidth;
}
