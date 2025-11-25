/**
 * Family layout utilities
 * Handles recursive positioning of families and individuals in the tree
 */

export interface LayoutParams {
    familiesLocal: any[];
    levelOf: Map<string, number>;
    computeFamilyWidth: (famId: string) => number;
    personWidthMap: Map<string, number>;
    maxGenerationsForward: number;
    maxGenerationsBackward: number;
    rowHeight: number;
    yOffset: number;
    singleWidth: number;
    dynamicSiblingGap: number;
}

export interface LayoutResult {
    pos: Record<string, { x: number; y: number }>;
    minX: number;
    maxX: number;
}

/**
 * Creates a layout function that recursively positions families and their members
 * Returns positioned coordinates for all individuals
 */
export function createFamilyLayouter(params: LayoutParams) {
    const { familiesLocal, levelOf, computeFamilyWidth, personWidthMap, maxGenerationsForward, maxGenerationsBackward, rowHeight, yOffset, singleWidth, dynamicSiblingGap } = params;
    
    const pos: Record<string, { x: number; y: number }> = {};
    const parentGap = 40; // desired gap between parent boxes

    function layoutFamily(famId: string, centerX: number, familiesProcessed: Set<string>): number {
        if (familiesProcessed.has(famId)) return 0;
        familiesProcessed.add(famId);
        
        const fam = familiesLocal.find((f: any) => f.id === famId);
        if (!fam) return 0;
        
        const parents: string[] = (fam.parents || []).slice();
        const kids: string[] = (fam.children || []).slice();
        
        // Position parents at their generation
        const parentLevel = parents.length > 0 ? (levelOf.get(parents[0]) ?? 0) : 0;
        const parentRow = parentLevel * 2;
        const parentY = parentRow * rowHeight + rowHeight / 2 + yOffset;
        
        // First, recursively layout parent families (upward traversal)
        parents.forEach((parentId: string) => {
            const parentFamily = familiesLocal.find((f: any) => (f.children || []).includes(parentId));
            if (parentFamily && !familiesProcessed.has(parentFamily.id)) {
                // Layout the parent's parent family centered above this position
                layoutFamily(parentFamily.id, centerX, familiesProcessed);
            }
        });
        
        // Position parents taking measured widths into account to avoid overlap
        if (parents.length === 1) {
            pos[parents[0]] = { x: centerX, y: parentY };
        } else if (parents.length >= 2) {
            const pWidths = parents.map((p: string) => personWidthMap.get(p) ?? singleWidth);
            const parentsTotalWidth = pWidths.reduce((s: number, w: number) => s + w, 0) + parentGap;
            // left edge of parents block
            let px = centerX - parentsTotalWidth / 2;
            parents.forEach((p: string, i: number) => {
                const w = pWidths[i];
                const cx = px + w / 2;
                pos[p] = { x: cx, y: parentY };
                px += w + parentGap; // move to next (this leaves extra gap but keeps things simple)
            });
        }
        
        // Position children and their families: compute widths per child so they pack tightly
        if (kids.length === 0) return singleWidth;

        // use prop `siblingGap` for spacing between siblings
        const childInfos = kids.map((kid: string) => {
            const childFam = familiesLocal.find((f: any) => (f.parents || []).includes(kid));
            const width = childFam ? computeFamilyWidth(childFam.id) : singleWidth;
            return { childId: kid, familyId: childFam?.id, width };
        });
        // filter out children beyond allowed forward/backward generations
        const visibleChildInfos = childInfos.filter((info: any) => {
            const lvl = levelOf.get(info.childId) ?? 0;
            return lvl <= maxGenerationsForward && lvl >= -maxGenerationsBackward;
        });
        const totalChildWidths = visibleChildInfos.reduce((s: number, c: any) => s + c.width, 0);
        const totalChildWidth = totalChildWidths + Math.max(0, visibleChildInfos.length - 1) * dynamicSiblingGap;
        let childCursor = centerX - totalChildWidth / 2;

        visibleChildInfos.forEach((info: any, idx: number) => {
            const childCenter = childCursor + info.width / 2;
            const childLevel = levelOf.get(info.childId) ?? 0;
            const childRow = childLevel * 2;
            const childY = childRow * rowHeight + rowHeight / 2 + yOffset;

            if (info.familyId) {
                layoutFamily(info.familyId, childCenter, familiesProcessed);
            } else {
                pos[info.childId] = { x: childCenter, y: childY };
            }

            // advance cursor by this child's width plus gap (except after last)
            childCursor += info.width + (idx < visibleChildInfos.length - 1 ? dynamicSiblingGap : 0);
        });

        return totalChildWidth;
    }

    return { layoutFamily, pos };
}

/**
 * Applies X and Y offsets to ensure all content is in positive space with padding
 */
export function applyXOffset(pos: Record<string, { x: number; y: number }>, targetMinX: number = 100, targetMinY: number = 100): LayoutResult {
    // Find min and max X and Y coordinates from all laid-out positions
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    Object.values(pos).forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });
    
    // Handle edge case where no positions exist
    if (minX === Infinity || maxX === -Infinity) {
        minX = 0;
        maxX = 1000;
    }
    if (minY === Infinity || maxY === -Infinity) {
        minY = 0;
        maxY = 1000;
    }
    
    // Apply offsets to ensure ALL content is in positive space with padding
    const xOffset = targetMinX - minX;
    const yOffset = targetMinY - minY;
    
    // Apply offset to all person positions
    Object.keys(pos).forEach((id) => {
        pos[id].x += xOffset;
        pos[id].y += yOffset;
    });
    
    // Update min/max after offset
    minX += xOffset;
    maxX += xOffset;

    return { pos, minX, maxX };
}
