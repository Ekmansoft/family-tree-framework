/**
 * Vertical tree layout strategy
 * Traditional genealogy layout with generations flowing top-to-bottom
 * This is the current default layout
 */

import { TreeLayoutStrategy, LayoutConfig, LayoutResult } from './types';
import { createFamilyWidthCalculator } from '../utils/familyWidthCalculation';
import { createFamilyLayouter, applyXOffset } from '../utils/familyLayout';
import { buildRelationshipMaps } from '../utils/treeFiltering';

export class VerticalTreeLayout implements TreeLayoutStrategy {
    computeLayout(
        individuals: any[],
        families: any[],
        levelOf: Map<string, number>,
        config: LayoutConfig
    ): LayoutResult {
        console.log('🌳 VerticalTreeLayout.computeLayout CALLED', { individuals: individuals.length, families: families.length, config });
        const { siblingGap, parentGap, familyPadding, maxGenerationsForward, maxGenerationsBackward } = config;
        const boxWidth = (config as any).boxWidth || 100;
        const boxHeight = (config as any).boxHeight || 40;
        const horizontalGap = (config as any).horizontalGap || 20;
        const familyToParentDistance = (config as any).familyToParentDistance || boxHeight;
        const familyToChildrenDistance = (config as any).familyToChildrenDistance || boxHeight;
        // Optional simple packing mode: repack persons per generation left-to-right
        const simplePacking = (config as any).simplePacking === true;
        console.log('🔧 simplePacking =', simplePacking);
        console.log('🔧 Using boxWidth:', boxWidth, 'boxHeight:', boxHeight, 'horizontalGap:', horizontalGap);
        console.log('🔧 Family distances - toParent:', familyToParentDistance, 'toChildren:', familyToChildrenDistance);
        
        // Build relationship maps
        const { childrenOf, parentsOf } = buildRelationshipMaps(families);
        
        // Calculate dimensions - rowHeight is sum of both family distances (parent-to-family + family-to-children)
        const rowHeight = familyToParentDistance + familyToChildrenDistance;
        let minLevel = 0;
        let maxLevel = 0;
        levelOf.forEach((lvl) => {
            if (lvl < minLevel) minLevel = lvl;
            if (lvl > maxLevel) maxLevel = lvl;
        });
        
        const totalLevels = maxLevel - minLevel;
        const totalHeight = (totalLevels * 2 + 3) * rowHeight;
        const yOffset = Math.abs(minLevel) * 2 * rowHeight + rowHeight;
        
        // Setup for width calculations
        const singleWidth = boxWidth;
        const personWidthMap = new Map<string, number>();
        individuals.forEach(ind => personWidthMap.set(ind.id, singleWidth));
        
        // Estimate tree width for dynamic sibling gap
        const estimatedTreeWidth = families.reduce((sum, f) => {
            const childCount = (f.children || []).length;
            return sum + childCount * (boxWidth + horizontalGap);
        }, 0);
        const dynamicSiblingGap = estimatedTreeWidth > 5000 ? Math.max(8, horizontalGap / 3) : horizontalGap;
        
        // Create family width calculator
        const computeFamilyWidth = createFamilyWidthCalculator({
            familiesLocal: families,
            levelOf,
            personWidthMap,
            maxGenerationsForward,
            maxGenerationsBackward,
            singleWidth,
            siblingGap: dynamicSiblingGap,
            parentGap,
            familyPadding
        });
        
        // Find root families
        const childParentFamily = new Map<string, string>();
        families.forEach((f: any) => {
            (f.children || []).forEach((c: string) => childParentFamily.set(c, f.id));
        });
        let rootFamilies = families.filter((f: any) => {
            const parents: string[] = (f.parents || []).slice();
            return !parents.some((p: string) => childParentFamily.has(p));
        });

        // Ancestor-only scenario: start traversal from the focus person's immediate parent family instead
        const focusIdForAncestorStart = (config as any).selectedId as string | undefined;
        if (focusIdForAncestorStart && maxGenerationsForward === 0) {
            const directParentFamilyId = childParentFamily.get(focusIdForAncestorStart);
            if (directParentFamilyId) {
                const directParentFamily = families.find(f => f.id === directParentFamilyId);
                if (directParentFamily) {
                    rootFamilies = [directParentFamily];
                }
            }
        }

        // Create layout function
        const { layoutFamily, pos } = createFamilyLayouter({
            individualsLocal: individuals,
            familiesLocal: families,
            levelOf,
            computeFamilyWidth,
            personWidthMap,
            maxGenerationsForward,
            maxGenerationsBackward,
            rowHeight,
            yOffset,
            singleWidth,
            siblingGap: dynamicSiblingGap
        });

        // Layout all root families horizontally
        const familiesProcessed = new Set<string>();
        const rootWidths = rootFamilies.map((f: any) => computeFamilyWidth(f.id));
        const totalTreeWidth = rootWidths.reduce((s: number, w: number) => s + w, 0) || 200;
        let cursor = 0;
        rootFamilies.forEach((fam: any, idx: number) => {
            const w = rootWidths[idx] || 200;
            const famCenter = cursor + w / 2;
            layoutFamily(fam.id, famCenter, familiesProcessed);
            cursor += w;
        });

        // Ensure focus/selected person is represented even if only ancestor generations were traversed
        const selectedId = (config as any).selectedId as string | undefined;
        if (selectedId && !pos[selectedId]) {
            const level = levelOf.get(selectedId) ?? 0;
            const row = level * 2;
            const fallbackX = (rootWidths.reduce((s: number, w: number) => s + w, 0) || 200) / 2;
            const fallbackY = row * rowHeight + rowHeight / 2 + yOffset;
            pos[selectedId] = { x: fallbackX, y: fallbackY };
        }
        
        // Apply X offset to ensure positive space
        let { pos: finalPos, minX, maxX } = applyXOffset(pos, 100);

        // Simple per-generation packing to reduce crossings: group spouses and pack left-to-right
        if (simplePacking) {
            console.log('🔧 VERTICAL LAYOUT: Simple packing mode ENABLED');
            // Build spouse groups per generation from families
            // Store grouping with explicit kind so we can space spouses vs siblings differently
            const levelToGroups = new Map<number, Array<{ ids: string[]; kind: 'spouses' | 'children' }>>();
            const personLevel = (pid: string) => levelOf.get(pid) ?? 0;
            const addGroup = (lvl: number, ids: string[], kind: 'spouses' | 'children') => {
                if (!levelToGroups.has(lvl)) levelToGroups.set(lvl, []);
                levelToGroups.get(lvl)!.push({ ids, kind });
            };
            // Precompute child order within parent families
            const childOrder = new Map<string, number>();
            families.forEach((fam: any) => {
                (fam.children || []).forEach((cid: string, idx: number) => {
                    childOrder.set(cid, idx);
                });
            });
            // Track which persons are already in spouse groups
            const inSpouseGroup = new Set<string>();
            // Spouse groups from families parents
            families.forEach((fam: any) => {
                const parents: string[] = (fam.parents || []).filter((pid: string) => finalPos[pid]);
                if (parents.length > 0) {
                    const lvl = personLevel(parents[0]);
                    addGroup(lvl, parents, 'spouses');
                    parents.forEach(pid => inSpouseGroup.add(pid));
                }
            });
            // Group siblings per family (instead of each child solo) if positioned
            families.forEach((fam: any) => {
                const children: string[] = (fam.children || []).filter((cid: string) => finalPos[cid] && !inSpouseGroup.has(cid));
                if (children.length > 0) {
                    const lvl = personLevel(children[0]);
                    addGroup(lvl, children, 'children');
                }
            });

            // Build reverse lookup: person -> parent IDs
            const personToParents = new Map<string, string[]>();
            families.forEach((fam: any) => {
                (fam.children || []).forEach((cid: string) => {
                    personToParents.set(cid, fam.parents || []);
                });
            });

            // For each level, sort groups by current x and repack
            const used = new Set<string>();
            // Find the topmost generation (most negative level for ancestors)
            const levels = Array.from(levelToGroups.keys()).sort((a, b) => a - b);
            const topLevel = levels.length > 0 ? levels[0] : 0;
            
            // Process levels from top (most negative) to bottom (least negative/positive)
            // This ensures parent positions are finalized before children are positioned
            levels.forEach(lvl => {
                const groups = levelToGroups.get(lvl) || [];
                
                // Deduplicate persons: if a person appears in multiple groups, keep the largest (spouse group)
                const uniqueGroups: Array<{ ids: string[]; kind: 'spouses' | 'children' }> = [];
                groups.forEach(g => {
                    const ids = g.ids.filter(id => !used.has(id));
                    if (ids.length > 0) uniqueGroups.push({ ids, kind: g.kind });
                    ids.forEach(id => used.add(id));
                });
                
                // For top generation, preserve original order; for lower generations, sort by family-child order
                if (lvl !== topLevel) {
                    // Sort by family-child order first, then by current x
                    const groupOrderKey = (g: { ids: string[] }) => {
                        const indices = g.ids.map(id => childOrder.get(id)).filter((v): v is number => typeof v === 'number');
                        if (indices.length > 0) return Math.min(...indices);
                        return Number.POSITIVE_INFINITY;
                    };
                    uniqueGroups.sort((a, b) => {
                        const ao = groupOrderKey(a);
                        const bo = groupOrderKey(b);
                        if (ao !== bo) return ao - bo;
                        const ax = Math.min(...a.ids.map(id => finalPos[id]?.x ?? 0));
                        const bx = Math.min(...b.ids.map(id => finalPos[id]?.x ?? 0));
                        return ax - bx;
                    });
                }
                
                // Compute row Y
                const row = lvl * 2;
                const y = row * rowHeight + rowHeight / 2 + yOffset;

                if (lvl === topLevel) {
                    // Top generation: distribute evenly with equal gaps
                    const numPersons = uniqueGroups.reduce((sum, g) => sum + g.ids.length, 0);
                    const totalPersonWidth = numPersons * singleWidth;
                    const gapCount = numPersons - 1;
                    const evenGap = gapCount > 0 ? siblingGap : 0;
                    const totalWidth = totalPersonWidth + gapCount * evenGap;
                    // Center around totalTreeWidth/2 for better alignment with tree structure
                    const center = totalTreeWidth / 2;
                    let cursor = center - totalWidth / 2;
                    let personIndex = 0;
                    
                    // Debug: log top generation positioning
                    console.log(`=== Top Generation (level ${lvl}) ===`);
                    console.log(`Total persons: ${numPersons}, singleWidth: ${singleWidth}, evenGap: ${evenGap}`);
                    console.log(`Total width: ${totalWidth}, center: ${center}, starting cursor: ${cursor}`);
                    
                    uniqueGroups.forEach((g, groupIdx) => {
                        console.log(`Group ${groupIdx}: [${g.ids.join(', ')}]`);
                        g.ids.forEach((pid) => {
                            const x = cursor + singleWidth / 2;
                            finalPos[pid] = { x, y };
                            console.log(`  ${pid}: x=${x.toFixed(2)}, cursor=${cursor.toFixed(2)}`);
                            cursor += singleWidth;
                            if (personIndex < numPersons - 1) {
                                cursor += evenGap;
                            }
                            personIndex++;
                        });
                    });
                    console.log(`=== End Top Generation ===\n`);
                } else {
                    // Lower generations. For descendants (lvl >= 1) we horizontally repack groups
                    // so that sibling/spouse clusters spread side-by-side instead of stacking
                    const isDescendantLevel = lvl >= 1;
                    console.log(`=== Lower Generation (level ${lvl}) ${isDescendantLevel ? '[DESCENDANT REPACK]' : ''} ===`);
                    // First gather per-group desired center based on parent averages
                    const groupData = uniqueGroups.map((g, groupIdx) => {
                        const intraGap = g.kind === 'children' ? siblingGap : parentGap;
                        const w = g.ids.length * singleWidth + Math.max(0, g.ids.length - 1) * intraGap;
                        const relativeIds: string[] = [];
                        g.ids.forEach(id => {
                            // For ancestors (negative levels), reference their children (below)
                            // For descendants (positive levels), reference their parents (above)
                            const relatives = lvl < 0 ? (childrenOf.get(id) || []) : (parentsOf.get(id) || []);
                            relatives.forEach(rid => relativeIds.push(rid));
                        });
                        const uniqueRelativeIds = Array.from(new Set(relativeIds));
                        const relativePositions = uniqueRelativeIds.map(rid => finalPos[rid]).filter(Boolean);
                        let centerX = 0;
                        if (relativePositions.length > 0) {
                            centerX = relativePositions.reduce((s, p) => s + p.x, 0) / relativePositions.length;
                        }
                        return { g, groupIdx, intraGap, w, centerX, relativePositions };
                    });
                    // If descendant level, sort by desired center (stable by groupIdx) and pack side-by-side
                    if (isDescendantLevel) {
                        // Separate spouse clusters (to be horizontally packed) from child clusters (aligned under parents)
                        const spouseData = groupData.filter(gd => gd.g.kind === 'spouses');
                        const childData = groupData.filter(gd => gd.g.kind === 'children');

                        // Pack spouse groups side-by-side
                        spouseData.sort((a, b) => a.centerX - b.centerX || a.groupIdx - b.groupIdx);
                        const interGroupGap = Math.max(siblingGap, 30);
                        const totalSpouseWidth = spouseData.reduce((s, gd) => s + gd.w, 0) + Math.max(0, spouseData.length - 1) * interGroupGap;
                        const avgSpouseCenter = spouseData.length > 0 ? spouseData.reduce((s, gd) => s + gd.centerX, 0) / spouseData.length : 0;
                        let packCursor = avgSpouseCenter - totalSpouseWidth / 2;
                        spouseData.forEach((gd, packedIdx) => {
                            const { g, intraGap, w, centerX, relativePositions, groupIdx } = gd;
                            console.log(`Spouse Group ${groupIdx}: [${g.ids.join(', ')}]`);
                            console.log(`  Desired centerX=${centerX.toFixed(2)} parentCenters=[${relativePositions.map(p => p.x.toFixed(2)).join(', ')}]`);
                            console.log(`  Packed segment start=${packCursor.toFixed(2)} width=${w}`);
                            let cursor = packCursor + singleWidth / 2;
                            // Compute Y from parent average when available to strictly enforce distances
                            const ySpouse = relativePositions.length > 0
                                ? (relativePositions.reduce((s, p) => s + p.y, 0) / relativePositions.length) + familyToParentDistance + familyToChildrenDistance
                                : y; // fallback to generation center when parents unknown
                            g.ids.forEach((pid, idx) => {
                                const x = cursor + idx * (singleWidth + intraGap);
                                finalPos[pid] = { x, y: ySpouse };
                                console.log(`    ${pid}: x=${x.toFixed(2)} y=${ySpouse.toFixed(2)} packedIdx=${packedIdx}`);
                            });
                            packCursor += w + interGroupGap;
                        });

                        // Align child groups centered beneath their parents; compute Y honoring configured distances
                        childData.forEach(gd => {
                            const { g, intraGap, w, centerX, relativePositions, groupIdx } = gd;
                            console.log(`Child Group ${groupIdx}: [${g.ids.join(', ')}] centerX=${centerX.toFixed(2)} parents=[${relativePositions.map(p => p.x.toFixed(2)).join(', ')}]`);
                            // If no parent info fallback to average spouse packing center
                            const effectiveCenter = relativePositions.length > 0 ? centerX : avgSpouseCenter;
                            let cursor = effectiveCenter - w / 2 + singleWidth / 2;
                            // Compute Y from parent average when available to strictly enforce distances
                            const yChild = relativePositions.length > 0
                                ? (relativePositions.reduce((s, p) => s + p.y, 0) / relativePositions.length) + familyToParentDistance + familyToChildrenDistance
                                : y; // fallback to generation center when parents unknown
                            g.ids.forEach((pid, idx) => {
                                const x = cursor + idx * (singleWidth + intraGap);
                                finalPos[pid] = { x, y: yChild };
                                console.log(`    ${pid}: x=${x.toFixed(2)} alignedUnderParents y=${yChild.toFixed(2)}`);
                            });
                        });
                        console.log(`=== End Lower Generation (DESCENDANT PACKED + CHILD ALIGNED) ===\n`);
                    } else {
                        // Ancestor lower levels (negative): position relative to children's Y (symmetric with descendants)
                        // Prevent horizontal overlap: pack ancestor groups side-by-side with siblingGap spacing.
                        // Sort by desired centerX to maintain visual alignment above children.
                        const sortedAncestorGroups = [...groupData].sort((a, b) => a.centerX - b.centerX || a.groupIdx - b.groupIdx);
                        // Compute total width if packed strictly side-by-side ignoring original centers
                        const groupGap = Math.max(siblingGap, 20);
                        const packedTotalWidth = sortedAncestorGroups.reduce((sum, gd) => sum + gd.w, 0) + Math.max(0, sortedAncestorGroups.length - 1) * groupGap;
                        const avgCenter = sortedAncestorGroups.length > 0 ? sortedAncestorGroups.reduce((s, gd) => s + gd.centerX, 0) / sortedAncestorGroups.length : 0;
                        let packCursor = avgCenter - packedTotalWidth / 2;
                        sortedAncestorGroups.forEach(({ g, intraGap, w, centerX, relativePositions, groupIdx }, packedIdx) => {
                            console.log(`Ancestor Group ${groupIdx}: [${g.ids.join(', ')}]`);
                            console.log(`  DesiredCenter=${centerX.toFixed(2)} packedStart=${packCursor.toFixed(2)} width=${w}`);
                            // Compute Y going upward from children
                            const yAncestor = relativePositions.length > 0
                                ? (relativePositions.reduce((s, p) => s + p.y, 0) / relativePositions.length) - (familyToParentDistance + familyToChildrenDistance)
                                : y;
                            let cursor = packCursor + singleWidth / 2;
                            g.ids.forEach((pid, idx) => {
                                const x = cursor + idx * (singleWidth + intraGap);
                                finalPos[pid] = { x, y: yAncestor };
                                console.log(`    ${pid}: x=${x.toFixed(2)} y=${yAncestor.toFixed(2)} packedIdx=${packedIdx}`);
                            });
                            packCursor += w + groupGap;
                        });
                        console.log(`=== End Lower Generation (ANCESTOR) ===\n`);
                    }
                }
            });
            // Recompute bounds after initial repacking
            ({ pos: finalPos, minX, maxX } = applyXOffset(finalPos, 100));

            // Ancestor refinement pass: adjust negative generation Y positions after children have definitive placement
            const negativeLevels = levels.filter(l => l < 0).sort((a, b) => b - a); // -1, -2, -3...
            if (negativeLevels.length > 0) {
                console.log('🔧 Ancestor refinement pass (levels descending from root):', negativeLevels);
                negativeLevels.forEach(lvl => {
                    const idsAtLevel = Object.keys(finalPos).filter(pid => (levelOf.get(pid) ?? 0) === lvl);
                    if (idsAtLevel.length === 0) return;
                    idsAtLevel.forEach(pid => {
                        const childIds = childrenOf.get(pid) || [];
                        const childPositions = childIds.map(cid => finalPos[cid]).filter(Boolean);
                        if (childPositions.length === 0) return; // cannot refine without children positions
                        const avgChildY = childPositions.reduce((s, p) => s + p.y, 0) / childPositions.length;
                        const refinedY = avgChildY - (familyToParentDistance + familyToChildrenDistance);
                        // Only adjust if refinement produces a smaller (higher on screen) Y to preserve ancestor-above-child ordering
                        if (refinedY < finalPos[pid].y - 1) {
                            finalPos[pid].y = refinedY;
                        }
                    });
                });
                // Re-offset after refinement
                ({ pos: finalPos, minX, maxX } = applyXOffset(finalPos, 100));
            }
        } else {
            console.log('🔧 VERTICAL LAYOUT: Simple packing mode DISABLED');
        }
        
        
        // Build family positions
        const familyPositions: Array<{
            id: string;
            x: number;
            y: number;
            parents: string[];
            children: string[];
        }> = [];
        
        const validIndividualIds = new Set(individuals.map((i: any) => i.id));
        
        // Group families by their parent sets to detect multiple marriages
        const parentSetToFamilies = new Map<string, any[]>();
        families.forEach((fam: any) => {
            const parents: string[] = (fam.parents || []).filter((pid: string) => validIndividualIds.has(pid));
            if (parents.length > 0) {
                // Use sorted parent IDs as key to group families with common parents
                const parentKey = parents.slice().sort().join(',');
                if (!parentSetToFamilies.has(parentKey)) {
                    parentSetToFamilies.set(parentKey, []);
                }
                parentSetToFamilies.get(parentKey)!.push(fam);
            }
        });
        
        families.forEach((fam: any) => {
            const parents: string[] = (fam.parents || []).filter((pid: string) => validIndividualIds.has(pid));
            const kids = (fam.children || []).filter((cid: string) => validIndividualIds.has(cid));
            
            const parentPos = parents.map((pid: string) => finalPos[pid]).filter(Boolean);
            const childPos = kids.map((cid: string) => finalPos[cid]).filter(Boolean);
            
            if (parentPos.length === 0 && childPos.length === 0) return;
            // If no visible parents, skip rendering this family box (do not draw toward invisible ancestors)
            if (parentPos.length === 0) return;
            
            const avg = (arr: { x: number; y: number }[]) => ({
                x: arr.reduce((s, a) => s + a.x, 0) / arr.length,
                y: arr.reduce((s, a) => s + a.y, 0) / arr.length
            });
            
            let familyX = totalTreeWidth / 2;
            let familyY = rowHeight;
            
            const parentLevels = parents.map((pid: string) => levelOf.get(pid)).filter((v): v is number => typeof v === 'number');
            
            if (parentPos.length > 0 && parentLevels.length > 0) {
                // Check if this is part of multiple marriages
                const parentKey = parents.slice().sort().join(',');
                const familiesWithSameParents = parentSetToFamilies.get(parentKey) || [fam];
                
                const pavg = avg(parentPos);
                familyY = pavg.y + familyToParentDistance;
                
                if (familiesWithSameParents.length > 1) {
                    // Multiple marriages: arrange families horizontally
                    const familyIndex = familiesWithSameParents.indexOf(fam);
                    const familySpacing = boxWidth * 1.5; // spacing between family boxes
                    const totalWidth = (familiesWithSameParents.length - 1) * familySpacing;
                    familyX = pavg.x - totalWidth / 2 + familyIndex * familySpacing;
                } else {
                    // Single marriage: center between parents
                    familyX = pavg.x;
                }
            }
            
            familyPositions.push({ id: fam.id, x: familyX, y: familyY, parents, children: kids });
        });

        // Optional ancestor-only generation centering: align each negative generation's horizontal span to focus X
        if (selectedId && maxGenerationsForward === 0 && finalPos[selectedId]) {
            const focusX = finalPos[selectedId].x;
            // Collect distinct negative levels present
            const negativeLevels = new Set<number>();
            Object.keys(finalPos).forEach(pid => {
                const lvl = levelOf.get(pid);
                if (typeof lvl === 'number' && lvl < 0) negativeLevels.add(lvl);
            });
            const sortedNegLevels = Array.from(negativeLevels).sort((a, b) => a - b); // e.g. -8 .. -1
            sortedNegLevels.forEach(lvl => {
                const idsAtLevel = Object.keys(finalPos).filter(pid => levelOf.get(pid) === lvl);
                if (idsAtLevel.length === 0) return;
                const minXGen = Math.min(...idsAtLevel.map(pid => finalPos[pid].x));
                const maxXGen = Math.max(...idsAtLevel.map(pid => finalPos[pid].x));
                const centerGen = (minXGen + maxXGen) / 2;
                const delta = focusX - centerGen;
                // Shift persons
                idsAtLevel.forEach(pid => { finalPos[pid].x += delta; });
                // Shift families whose parents lie exactly on this level
                familyPositions.forEach(famPos => {
                    const parentLevels = famPos.parents.map(pid => levelOf.get(pid)).filter((v): v is number => typeof v === 'number');
                    if (parentLevels.length > 0) {
                        // Parents should share same level after generation assignment adjustments
                        const parentLevel = parentLevels[0];
                        if (parentLevels.every(pl => pl === parentLevel) && parentLevel === lvl) {
                            famPos.x += delta;
                        }
                    }
                });
            });
            // Recompute bounds after centering
            ({ pos: finalPos, minX, maxX } = applyXOffset(finalPos, 100));
        }

        const actualTreeWidth = maxX + 100;
        
        return {
            personPositions: finalPos,
            familyPositions,
            bounds: {
                width: actualTreeWidth,
                height: totalHeight,
                minX,
                maxX,
                minY: 0,
                maxY: totalHeight
            }
        };
    }
}
