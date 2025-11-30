/**
 * Family layout utilities
 * Handles recursive positioning of families and individuals in the tree
 */

import type { Individual, Family, Position } from '../types';

export interface LayoutParams {
    individualsLocal: Individual[];
    familiesLocal: Family[];
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
    parentGap?: number;
    ancestorFamilyGap?: number;
    descendantFamilyGap?: number;
}

export type LayoutDirection = 'ancestor' | 'descendant' | 'both';

export interface LayoutResult {
    pos: Record<string, Position>;
    minX: number;
    maxX: number;
}

/**
 * Creates a layout function that recursively positions families and their members
 * Returns positioned coordinates for all individuals
 */
export function createFamilyLayouter(params: LayoutParams) {
    const { individualsLocal, familiesLocal, levelOf, computeFamilyWidth, personWidthMap, maxGenerationsForward, maxGenerationsBackward, rowHeight, yOffset, singleWidth, siblingGap, selectedId } = params;
    
    const pos: Record<string, Position> = {};
    
    // Layout constants - use provided values or defaults
    const PARENT_GAP = params.parentGap ?? 20; // gap between parent boxes (spouses)
    const ANCESTOR_FAMILY_GAP = params.ancestorFamilyGap ?? 40; // gap between different ancestor family trees
    const DESCENDANT_FAMILY_GAP = params.descendantFamilyGap ?? 40; // gap between different descendant family trees
    const MAX_COLLISION_SEARCH_DISTANCE = 2000; // maximum pixels to search for non-overlapping position
    
    // Create Map-based lookups for O(1) access
    const familyById = new Map(familiesLocal.map(f => [f.id, f]));
    const individualById = new Map(individualsLocal.map(i => [i.id, i]));
    
    // Build reverse lookup: person -> families where they are a child (for finding parent families)
    const personToParentFamily = new Map<string, Family | undefined>();
    familiesLocal.forEach(fam => {
        (fam.children || []).forEach(childId => {
            // Each person typically has only one biological parent family
            if (!personToParentFamily.has(childId)) {
                personToParentFamily.set(childId, fam);
            }
        });
    });
    
    // Build reverse lookup: person -> families where they are a parent (for finding child families)
    const personToChildFamilies = new Map<string, Family[]>();
    familiesLocal.forEach(fam => {
        (fam.parents || []).forEach(parentId => {
            if (!personToChildFamilies.has(parentId)) {
                personToChildFamilies.set(parentId, []);
            }
            personToChildFamilies.get(parentId)!.push(fam);
        });
    });
    
    // Track occupied horizontal ranges at each generation level to prevent overlaps
    const occupiedRanges: Map<number, Array<{ min: number; max: number }>> = new Map();
    
    // Store the selected person's x position for centering generations
    let selectedPersonX: number | null = null;
    
    // Helper function to calculate total width needed for a generation
    // Only count immediate family width (parents), not recursive ancestors/descendants
    function calculateGenerationWidth(generation: number, families: string[], gapSize: number): number {
        let totalWidth = 0;
        families.forEach(famId => {
            // Use a simple width estimate: number of parents * person width
            const fam = familyById.get(famId);
            const numParents = (fam?.parents || []).length;
            const width = Math.max(numParents * singleWidth + (numParents - 1) * PARENT_GAP, singleWidth * 2);
            totalWidth += width + gapSize;
        });
        return Math.max(0, totalWidth - gapSize); // Remove last gap
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
        for (let offset = ANCESTOR_FAMILY_GAP; offset < MAX_COLLISION_SEARCH_DISTANCE; offset += ANCESTOR_FAMILY_GAP) {
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
        
        const fam = familyById.get(famId);
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
            // Use reverse lookup to find parent family
            const parentFam = personToParentFamily.get(parents[0]);
            const famWidth = parentFam ? computeFamilyWidth(parentFam.id) : singleWidth;
            parentPositions = [{ id: parents[0], x: centerX, y: parentY, familyWidth: famWidth }];
        } else if (parents.length >= 2) {
            const parentBoxWidths = parents.map((p: string) => personWidthMap.get(p) ?? singleWidth);
            
            // Always keep spouses close together with simple spacing
            const totalParentBoxWidth = parentBoxWidths.reduce((s, w) => s + w, 0) + Math.max(0, parents.length - 1) * PARENT_GAP;
            let px = centerX - totalParentBoxWidth / 2;
            
            parents.forEach((p: string, i: number) => {
                const boxWidth = parentBoxWidths[i];
                const cx = px + boxWidth / 2;
                
                parentPositions.push({ id: p, x: cx, y: parentY, familyWidth: singleWidth });
                
                if (typeof window !== 'undefined' && (window as any).DEBUG_LAYOUT) {
                    console.log(`  Parent ${p} at x=${cx} (simple spacing)`);
                }
                
                px += boxWidth;
                if (i < parents.length - 1) {
                    px += PARENT_GAP;
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
            const parentFamily = personToParentFamily.get(pp.id);
            return parentFamily && !familiesProcessed.has(parentFamily.id);
        });
        
        if (parentsWithAncestors.length > 0) {
            const parentFamilyLevel = parentLevel - 1; // One generation up
            
            // Sort parents by their x position (left to right) to maintain order
            const sortedParents = [...parentsWithAncestors].sort((a, b) => a.x - b.x);
            
            // Calculate total width needed for this generation's families
            const familyIds = sortedParents.map(pp => {
                const parentFamily = personToParentFamily.get(pp.id);
                return parentFamily?.id;
            }).filter(id => id) as string[];
            
            const totalGenWidth = calculateGenerationWidth(parentFamilyLevel, familyIds, ANCESTOR_FAMILY_GAP);
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
                const parentFamily = personToParentFamily.get(pp.id);
                if (parentFamily) {
                    // Use simple width (just the parents, not recursive ancestors)
                    const numParents = (parentFamily.parents || []).length;
                    const familyWidth = Math.max(numParents * singleWidth + (numParents - 1) * PARENT_GAP, singleWidth * 2);
                    
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
                    currentX += familyWidth + ANCESTOR_FAMILY_GAP;
                }
            });
        }
        
        // Position children and their families: compute widths per child so they pack tightly
        if (kids.length === 0) return singleWidth;

        // Sort children by birth date (oldest to youngest, left to right)
        const sortedKids = [...kids].sort((a, b) => {
            const personA = individualById.get(a);
            const personB = individualById.get(b);
            const dateA = String(personA?.birthDate || '');
            const dateB = String(personB?.birthDate || '');
            return dateA.localeCompare(dateB);
        });

        // For descendants, handle multiple marriages - each child may have multiple families
        // Expand children with multiple spouses into separate entries for each family
        const childInfos: Array<{ childId: string; familyId?: string; width: number }> = [];
        
        sortedKids.forEach((kid: string) => {
            // Find ALL families where this child is a parent (multiple marriages)
            const childFamilies = personToChildFamilies.get(kid) || [];
            
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
                    const width = Math.max(numParents * singleWidth + (numParents - 1) * PARENT_GAP, singleWidth);
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
        const totalChildWidth = totalChildWidths + Math.max(0, visibleChildInfos.length - 1) * DESCENDANT_FAMILY_GAP;
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
            childCursor += info.width + (idx < visibleChildInfos.length - 1 ? DESCENDANT_FAMILY_GAP : 0);
        });

        return totalChildWidth;
    }

    return { layoutFamily, pos };
}

// Collect ancestor family groups generation-by-generation (pure helper)
// Returns an array where index 0 is generation 1 (parents of start family),
// index 1 is generation 2, etc., each entry is an array of family IDs.
export function collectAncestorGenerations(families: Family[], startFamilyId: string, maxGenerationsBack: number): string[][] {
    const familyById = new Map(families.map(f => [f.id, f]));

    // Build reverse lookup: person -> families where they are a child
    const personToParentFamily = new Map<string, Family | undefined>();
    families.forEach(fam => {
        (fam.children || []).forEach(childId => {
            if (!personToParentFamily.has(childId)) {
                personToParentFamily.set(childId, fam);
            }
        });
    });

    const result: string[][] = [];
    let currentFamilies: string[] = [startFamilyId];

    for (let gen = 1; gen <= maxGenerationsBack; gen++) {
        const nextFamilies: string[] = [];

        // For each family in current generation, collect their parents' families (one generation up)
        currentFamilies.forEach(famId => {
            const fam = familyById.get(famId);
            if (!fam) return;

            const parents = fam.parents || [];
            // For each parent, find the family where that parent is a child (their parent family)
            parents.forEach(parentId => {
                const parentFamily = personToParentFamily.get(parentId);
                if (parentFamily && !nextFamilies.includes(parentFamily.id)) {
                    nextFamilies.push(parentFamily.id);
                }
            });
        });

        if (nextFamilies.length === 0) break;
        result.push(nextFamilies);
        currentFamilies = nextFamilies;
    }

    return result;
}

// Compute ancestor family centers generation-by-generation.
// - `personX` provides x positions for persons (children) to anchor preferences.
// - Returns array per generation of objects { familyId, centerX, width }
export function computeAncestorFamilyCenters(
    families: Family[],
    personX: Record<string, number>,
    startFamilyId: string,
    maxGenerationsBack: number,
    singleWidth: number,
    parentGap: number,
    ancestorFamilyGap: number
): Array<Array<{ familyId: string; centerX: number; width: number }>> {
    const familyById = new Map(families.map(f => [f.id, f]));

    // Helper to get families where a person is a child
    const personToParentFamily = new Map<string, Family | undefined>();
    families.forEach(fam => {
        (fam.children || []).forEach(childId => {
            if (!personToParentFamily.has(childId)) {
                personToParentFamily.set(childId, fam);
            }
        });
    });

    const result: Array<Array<{ familyId: string; centerX: number; width: number }>> = [];
    let currentFamilies: string[] = [startFamilyId];

    for (let gen = 1; gen <= maxGenerationsBack; gen++) {
        const nextFamilies: string[] = [];
        const centers: Array<{ familyId: string; centerX: number; width: number }> = [];

        // Collect unique parent families for this generation, preserving insertion order
        const parentFamilyIds: string[] = [];
        currentFamilies.forEach(famId => {
            const fam = familyById.get(famId);
            if (!fam) return;
            const parents = fam.parents || [];
            parents.forEach(pid => {
                const pf = personToParentFamily.get(pid);
                if (pf && !parentFamilyIds.includes(pf.id)) parentFamilyIds.push(pf.id);
            });
        });

        if (parentFamilyIds.length === 0) break;

        // For each parent family, compute preferred center as average x of its children
        parentFamilyIds.forEach(famId => {
            const fam = familyById.get(famId)!;
            const children = fam.children || [];
            const childXs = children.map(cid => personX[cid]).filter(x => typeof x === 'number');
            const preferred = childXs.length > 0 ? (childXs.reduce((s, v) => s + v, 0) / childXs.length) : 0;
            const numParents = (fam.parents || []).length;
            const width = Math.max(numParents * singleWidth + Math.max(0, numParents - 1) * parentGap, singleWidth * 2);
            centers.push({ familyId: famId, centerX: preferred, width });
        });

        // Now place them left-to-right. Start from first family's preferred center
        let currentX = centers[0].centerX - centers[0].width / 2;
        for (let i = 0; i < centers.length; i++) {
            const c = centers[i];
            // For the first family, center on preferred (if non-zero), else use currentX+width/2
            let centerX: number;
            if (i === 0 && c.centerX !== 0) {
                centerX = c.centerX;
                currentX = centerX + c.width / 2 + ancestorFamilyGap;
            } else {
                centerX = currentX + c.width / 2;
                currentX += c.width + ancestorFamilyGap;
            }
            // Record center
            centers[i].centerX = centerX;
        }

        result.push(centers);

        // Prepare next generation
        centers.forEach(ct => {
            const fam = familyById.get(ct.familyId)!;
            (fam.parents || []).forEach(pId => {
                const pf = personToParentFamily.get(pId);
                if (pf && !nextFamilies.includes(pf.id)) nextFamilies.push(pf.id);
            });
        });

        // Update personX for next generation: set parent positions (parents will be positioned later by caller)
        // Here we set each parent (person id) x to the appropriate spot based on family parents order
        centers.forEach(ct => {
            const fam = familyById.get(ct.familyId)!;
            const parents = fam.parents || [];
            // split total parent box into individual center positions
            let px = ct.centerX - ( (parents.length * singleWidth + Math.max(0, parents.length -1) * parentGap) / 2 );
            parents.forEach((pid, idx) => {
                const cx = px + singleWidth / 2;
                personX[pid] = cx;
                px += singleWidth;
                if (idx < parents.length - 1) px += parentGap;
            });
        });

        currentFamilies = nextFamilies;
    }

    return result;
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
