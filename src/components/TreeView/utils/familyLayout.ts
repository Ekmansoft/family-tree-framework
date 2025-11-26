/**
 * Family layout utilities
 * Handles recursive positioning of families and individuals in the tree
 */

export interface LayoutParams {
    individualsLocal: any[];
    familiesLocal: any[];
    levelOf: Map<string, number>;
    computeFamilyWidth: (famId: string) => number;
    personWidthMap: Map<string, number>;
    maxGenerationsForward: number;
    maxGenerationsBackward: number;
    rowHeight: number;
    yOffset: number;
    singleWidth: number;
    siblingGap: number;
    selectedId?: string | null;
}

export type LayoutDirection = 'ancestor' | 'descendant' | 'both';

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
    const { individualsLocal, familiesLocal, levelOf, computeFamilyWidth, personWidthMap, maxGenerationsForward, maxGenerationsBackward, rowHeight, yOffset, singleWidth, siblingGap, selectedId } = params;
    
    const pos: Record<string, { x: number; y: number }> = {};
    const parentGap = 20; // desired gap between parent boxes (spouses)
    const ancestorFamilyGap = 40; // gap between different ancestor family trees
    const descendantFamilyGap = 40; // gap between different descendant family trees
    
    // Track occupied horizontal ranges at each generation level to prevent overlaps
    const occupiedRanges: Map<number, Array<{ min: number; max: number }>> = new Map();
    
    // Store the selected person's x position for centering generations
    let selectedPersonX: number | null = null;
    
    // Track the offset for centering each generation
    const generationOffsets: Map<number, number> = new Map();
    
    // Helper function to calculate total width needed for a generation
    // Only count immediate family width (parents + children), not recursive ancestors
    function calculateGenerationWidth(generation: number, families: string[]): number {
        let totalWidth = 0;
        families.forEach(famId => {
            // Use a simple width estimate: number of parents * person width
            const fam = familiesLocal.find(f => f.id === famId);
            const numParents = (fam?.parents || []).length;
            const width = Math.max(numParents * singleWidth + (numParents - 1) * parentGap, singleWidth * 2);
            totalWidth += width + ancestorFamilyGap;
        });
        return Math.max(0, totalWidth - ancestorFamilyGap); // Remove last gap
    }
    
    // Helper function to calculate descendant generation width
    // For descendants, use simple width based on number of spouses in each family
    function calculateDescendantGenerationWidth(generation: number, families: string[]): number {
        let totalWidth = 0;
        families.forEach(famId => {
            const fam = familiesLocal.find(f => f.id === famId);
            const numParents = (fam?.parents || []).length;
            const width = Math.max(numParents * singleWidth + (numParents - 1) * parentGap, singleWidth * 2);
            totalWidth += width + descendantFamilyGap;
        });
        return Math.max(0, totalWidth - descendantFamilyGap); // Remove last gap
    }
    
    // Helper function to get or calculate the offset for centering a generation
    function getGenerationOffset(generation: number): number {
        if (!generationOffsets.has(generation)) {
            generationOffsets.set(generation, 0);
        }
        return generationOffsets.get(generation)!;
    }
    
    // Helper function to check if a range overlaps with existing ranges at a generation
    function hasOverlap(generation: number, min: number, max: number): boolean {
        const ranges = occupiedRanges.get(generation) || [];
        return ranges.some(range => !(max < range.min || min > range.max));
    }
    
    // Helper function to find a non-overlapping position for a family at a generation
    function findNonOverlappingX(generation: number, preferredX: number, width: number): number {
        const ranges = occupiedRanges.get(generation) || [];
        if (ranges.length === 0) return preferredX;
        
        const halfWidth = width / 2;
        let testX = preferredX;
        
        // Try preferred position first
        if (!hasOverlap(generation, testX - halfWidth, testX + halfWidth)) {
            return testX;
        }
        
        // Search outward from preferred position
        for (let offset = ancestorFamilyGap; offset < 2000; offset += ancestorFamilyGap) {
            // Try to the right
            testX = preferredX + offset;
            if (!hasOverlap(generation, testX - halfWidth, testX + halfWidth)) {
                return testX;
            }
            
            // Try to the left
            testX = preferredX - offset;
            if (!hasOverlap(generation, testX - halfWidth, testX + halfWidth)) {
                return testX;
            }
        }
        
        return preferredX; // Fallback
    }
    
    // Helper function to mark a range as occupied at a generation
    function markOccupied(generation: number, min: number, max: number) {
        if (!occupiedRanges.has(generation)) {
            occupiedRanges.set(generation, []);
        }
        occupiedRanges.get(generation)!.push({ min, max });
    }

    function layoutFamily(famId: string, centerX: number, familiesProcessed: Set<string>, direction: LayoutDirection = 'both'): number {
        if (familiesProcessed.has(famId)) return 0;
        familiesProcessed.add(famId);
        
        const fam = familiesLocal.find((f: any) => f.id === famId);
        if (!fam) return 0;
        
        const parents: string[] = (fam.parents || []).slice();
        const kids: string[] = (fam.children || []).slice();
        
        if (typeof window !== 'undefined' && (window as any).DEBUG_LAYOUT) {
            console.log(`Layout family ${famId} at centerX=${centerX}, parents=[${parents.join(', ')}], children=[${kids.join(', ')}]`);
        }
        
        // Position parents at their generation
        const parentLevel = parents.length > 0 ? (levelOf.get(parents[0]) ?? 0) : 0;
        const parentRow = parentLevel * 2;
        const parentY = parentRow * rowHeight + rowHeight / 2 + yOffset;
        
        // Calculate widths needed for each parent's parent family to avoid overlaps
        let parentPositions: Array<{ id: string; x: number; y: number; familyWidth: number }> = [];
        
        if (parents.length === 1) {
            const parentFam = familiesLocal.find((f: any) => (f.children || []).includes(parents[0]));
            const famWidth = parentFam ? computeFamilyWidth(parentFam.id) : singleWidth;
            parentPositions = [{ id: parents[0], x: centerX, y: parentY, familyWidth: famWidth }];
        } else if (parents.length >= 2) {
            const parentBoxWidths = parents.map((p: string) => personWidthMap.get(p) ?? singleWidth);
            
            // Always keep spouses close together with simple spacing
            const totalParentBoxWidth = parentBoxWidths.reduce((s, w) => s + w, 0) + Math.max(0, parents.length - 1) * parentGap;
            let px = centerX - totalParentBoxWidth / 2;
            
            // When in ancestor/both mode, calculate ancestor family widths for positioning their families
            const useAncestorSpacing = direction === 'ancestor' || direction === 'both';
            
            parents.forEach((p: string, i: number) => {
                const boxWidth = parentBoxWidths[i];
                const cx = px + boxWidth / 2;
                
                parentPositions.push({ id: p, x: cx, y: parentY, familyWidth: singleWidth });
                
                if (typeof window !== 'undefined' && (window as any).DEBUG_LAYOUT) {
                    console.log(`  Parent ${p} at x=${cx} (simple spacing)`);
                }
                
                px += boxWidth;
                if (i < parents.length - 1) {
                    px += parentGap;
                }
            });
        }
        
    // Set parent positions and mark occupied space
    parentPositions.forEach(pp => {
        pos[pp.id] = { x: pp.x, y: pp.y };
        // Store selected person's position for centering
        if (selectedId && pp.id === selectedId) {
            selectedPersonX = pp.x;
        }
        // Mark the space occupied by this person at their generation
        const personWidth = personWidthMap.get(pp.id) ?? singleWidth;
        markOccupied(parentLevel, pp.x - personWidth / 2, pp.x + personWidth / 2);
    });        // Now recursively layout each parent's parent family
        // Check for overlaps and adjust position if needed
        const parentsWithAncestors = parentPositions.filter(pp => {
            const parentFamily = familiesLocal.find((f: any) => (f.children || []).includes(pp.id));
            return parentFamily && !familiesProcessed.has(parentFamily.id);
        });
        
        if (parentsWithAncestors.length > 0) {
            const parentFamilyLevel = parentLevel - 1; // One generation up
            
            // Sort parents by their x position (left to right) to maintain order
            const sortedParents = [...parentsWithAncestors].sort((a, b) => a.x - b.x);
            
            // Calculate total width needed for this generation's families
            const familyIds = sortedParents.map(pp => {
                const parentFamily = familiesLocal.find((f: any) => (f.children || []).includes(pp.id));
                return parentFamily?.id;
            }).filter(id => id) as string[];
            
            const totalGenWidth = calculateGenerationWidth(parentFamilyLevel, familyIds);
            // Center around selected person if available, otherwise use family center
            const centerPoint = selectedPersonX !== null ? selectedPersonX : centerX;
            const genOffset = centerPoint - totalGenWidth / 2;
            
            if (typeof window !== 'undefined' && (window as any).DEBUG_LAYOUT) {
                console.log(`  Positioning ${familyIds.length} ancestor families at generation ${parentFamilyLevel}, totalWidth=${totalGenWidth}, centered at ${centerPoint}`);
            }
            
            // Track position as we place families left to right
            let currentX = genOffset;
            
            // Position each ancestor family, checking for overlaps
            sortedParents.forEach((pp) => {
                const parentFamily = familiesLocal.find((f: any) => (f.children || []).includes(pp.id));
                if (parentFamily) {
                    // Use simple width (just the parents, not recursive ancestors)
                    const numParents = (parentFamily.parents || []).length;
                    const familyWidth = Math.max(numParents * singleWidth + (numParents - 1) * parentGap, singleWidth * 2);
                    
                    if (typeof window !== 'undefined' && (window as any).DEBUG_LAYOUT) {
                        console.log(`    Family ${parentFamily.id} width=${familyWidth}`);
                    }
                    
                    // Position at currentX + half width
                    const familyCenterX = currentX + familyWidth / 2;
                    
                    // Find non-overlapping position (prefer the calculated position)
                    const adjustedX = findNonOverlappingX(parentFamilyLevel, familyCenterX, familyWidth);
                    
                    // Layout the family at the adjusted position
                    layoutFamily(parentFamily.id, adjustedX, familiesProcessed, 'ancestor');
                    
                    // Mark the space occupied by this family
                    markOccupied(parentFamilyLevel, adjustedX - familyWidth / 2, adjustedX + familyWidth / 2);
                    
                    // Advance position for next family
                    currentX += familyWidth + ancestorFamilyGap;
                }
            });
        }
        
        // Position children and their families: compute widths per child so they pack tightly
        if (kids.length === 0) return singleWidth;

        // Sort children by birth date (oldest to youngest, left to right)
        const sortedKids = [...kids].sort((a, b) => {
            const personA = individualsLocal.find(p => p.id === a);
            const personB = individualsLocal.find(p => p.id === b);
            const dateA = String(personA?.birthDate || '');
            const dateB = String(personB?.birthDate || '');
            return dateA.localeCompare(dateB);
        });

        // For descendants, handle multiple marriages - each child may have multiple families
        // Expand children with multiple spouses into separate entries for each family
        const childInfos: Array<{ childId: string; familyId?: string; width: number }> = [];
        
        sortedKids.forEach((kid: string) => {
            // Find ALL families where this child is a parent (multiple marriages)
            const childFamilies = familiesLocal.filter((f: any) => (f.parents || []).includes(kid));
            
            if (childFamilies.length === 0) {
                // Child has no spouse family, just add them as a single person
                childInfos.push({ childId: kid, familyId: undefined, width: singleWidth });
            } else {
                // Sort multiple marriages by marriage date (if available), otherwise by family ID
                const sortedFamilies = childFamilies.sort((a, b) => {
                    const dateA = String(a.marriageDate || '');
                    const dateB = String(b.marriageDate || '');
                    if (dateA && dateB) {
                        return dateA.localeCompare(dateB);
                    } else if (dateA) {
                        return -1; // a has date, b doesn't - a comes first
                    } else if (dateB) {
                        return 1; // b has date, a doesn't - b comes first
                    }
                    return a.id.localeCompare(b.id); // fallback to family ID
                });
                
                // Add an entry for each family (marriage) this child has
                sortedFamilies.forEach(childFam => {
                    // Use simple width: number of parents (spouses) in the child's family
                    const numParents = (childFam.parents || []).length;
                    const width = Math.max(numParents * singleWidth + (numParents - 1) * parentGap, singleWidth);
                    childInfos.push({ childId: kid, familyId: childFam.id, width });
                });
            }
        });
        
        if (typeof window !== 'undefined' && (window as any).DEBUG_LAYOUT && childInfos.length > 1) {
            console.log(`  ${famId} children widths:`, childInfos.map(c => `${c.childId}(${c.familyId})=${c.width}`).join(', '));
        }
        
        // filter out children beyond allowed forward/backward generations
        const visibleChildInfos = childInfos.filter((info: any) => {
            const lvl = levelOf.get(info.childId) ?? 0;
            return lvl <= maxGenerationsForward && lvl >= -maxGenerationsBackward;
        });
        
        // Calculate total width and center around selected person (or family center)
        const totalChildWidths = visibleChildInfos.reduce((s: number, c: any) => s + c.width, 0);
        const totalChildWidth = totalChildWidths + Math.max(0, visibleChildInfos.length - 1) * descendantFamilyGap;
        const centerPoint = selectedPersonX !== null ? selectedPersonX : centerX;
        let childCursor = centerPoint - totalChildWidth / 2;

        visibleChildInfos.forEach((info: any, idx: number) => {
            const childLevel = levelOf.get(info.childId) ?? 0;
            const childRow = childLevel * 2;
            const childY = childRow * rowHeight + rowHeight / 2 + yOffset;
            
            // Calculate initial position
            const childCenter = childCursor + info.width / 2;
            
            // Check for overlaps and adjust position if needed
            const adjustedChildCenter = findNonOverlappingX(childLevel, childCenter, info.width);

            if (info.familyId) {
                // When going down to children, we're in descendant mode
                layoutFamily(info.familyId, adjustedChildCenter, familiesProcessed, 'descendant');
                // Mark the space occupied by this family
                markOccupied(childLevel, adjustedChildCenter - info.width / 2, adjustedChildCenter + info.width / 2);
            } else {
                pos[info.childId] = { x: adjustedChildCenter, y: childY };
                // Mark the space occupied by this person
                const personWidth = personWidthMap.get(info.childId) ?? singleWidth;
                markOccupied(childLevel, adjustedChildCenter - personWidth / 2, adjustedChildCenter + personWidth / 2);
            }

            // advance cursor by this child's width plus gap (except after last)
            childCursor += info.width + (idx < visibleChildInfos.length - 1 ? descendantFamilyGap : 0);
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
