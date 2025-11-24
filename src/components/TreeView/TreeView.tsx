import React, { useLayoutEffect, useRef, useState } from 'react';

interface TreeViewProps {
    individuals: any[];
    families?: any[];
    selectedId?: string | null;
    onSelectPerson?: (id: string) => void;
    onSelectFamily?: (id: string) => void;
    // spacing props (optional)
    siblingGap?: number; // px gap between sibling child blocks
    parentGap?: number; // px gap between parent boxes
    familyPadding?: number; // extra padding when sizing family blocks
    focusItem?: string | null; // id of person or family where decoding starts
    maxGenerationsForward?: number; // how many younger generations to render (forward)
    maxGenerationsBackward?: number; // how many older generations to render (backward)
    maxNumberOfTrees?: number; // how many separate tree components to draw
}

// Render a single tree: each person is one node placed by generation (distance from root)
export const TreeView: React.FC<TreeViewProps> = ({ individuals, families = [], selectedId, onSelectPerson, onSelectFamily, siblingGap = 28, parentGap = 40, familyPadding = 16, focusItem = null, maxGenerationsForward = 100, maxGenerationsBackward = 10, maxNumberOfTrees = 5 }) => {
    // Build quick lookup maps (created after optional filtering below)

    // Build parent -> children edges from families
    const childrenOf = new Map<string, string[]>();
    const parentsOf = new Map<string, string[]>();

    families.forEach((fam) => {
        const kids: string[] = (fam.children || []).map((c: string) => c);
        const parents: string[] = (fam.parents || []).slice();

        parents.forEach((p) => {
            if (!childrenOf.has(p)) childrenOf.set(p, []);
            childrenOf.get(p)!.push(...kids);
        });

        kids.forEach((c) => {
            if (!parentsOf.has(c)) parentsOf.set(c, []);
            parentsOf.get(c)!.push(...parents);
        });
    });

    // Optionally limit how many separate trees are drawn.
    // Behavior: select the first N "root families" in file order and include
    // their descendant families (simple DFS over child families). This matches
    // the user's request to take the first tree(s) from the GEDCOM rather than
    // trying to compute the largest components.
    let familiesLocal = families;
    let individualsLocal = individuals;
    if (typeof maxNumberOfTrees === 'number' && isFinite(maxNumberOfTrees)) {
        const take = Math.max(0, Math.floor(maxNumberOfTrees));
        if (take > 0 && families.length > 0) {
            // Find root families: families whose parents are not children in any family
            const parentIsChild = new Set<string>();
            families.forEach((f) => { (f.children || []).forEach((c: string) => parentIsChild.add(c)); });
            const rootFamiliesOrdered = families.filter((f) => {
                const parents: string[] = (f.parents || []).slice();
                return !parents.some((p) => parentIsChild.has(p));
            });

            const selectedRoots = rootFamiliesOrdered.slice(0, take);
            if (selectedRoots.length > 0) {
                // Collect descendant families starting from each selected root
                const allowedFamilies = new Set<string>();
                const stack: string[] = selectedRoots.map((f) => f.id);
                while (stack.length) {
                    const fid = stack.pop()!;
                    if (allowedFamilies.has(fid)) continue;
                    allowedFamilies.add(fid);
                    const fam = families.find((f) => f.id === fid);
                    if (!fam) continue;
                    (fam.children || []).forEach((childId: string) => {
                        const childFam = families.find((f) => (f.parents || []).includes(childId));
                        if (childFam && !allowedFamilies.has(childFam.id)) stack.push(childFam.id);
                    });
                }
                familiesLocal = families.filter((f) => allowedFamilies.has(f.id));
                const allowedIndividuals = new Set<string>();
                familiesLocal.forEach((f) => { (f.parents || []).forEach((p: string) => allowedIndividuals.add(p)); (f.children || []).forEach((c: string) => allowedIndividuals.add(c)); });
                individualsLocal = individuals.filter((i) => allowedIndividuals.has(i.id));
            }
        }
    }

    // Rebuild child/parent maps to reflect filtered dataset (if filtering happened)
    childrenOf.clear();
    parentsOf.clear();
    familiesLocal.forEach((fam) => {
        const kids: string[] = (fam.children || []).map((c: string) => c);
        const parents: string[] = (fam.parents || []).slice();
        parents.forEach((p) => {
            if (!childrenOf.has(p)) childrenOf.set(p, []);
            childrenOf.get(p)!.push(...kids);
        });
        kids.forEach((c) => {
            if (!parentsOf.has(c)) parentsOf.set(c, []);
            parentsOf.get(c)!.push(...parents);
        });
    });

    const individualsById = new Map<string, any>(individualsLocal.map((i) => [i.id, i]));

    // Determine starting individuals (roots) for generation assignment.
    // If `focusItem` is provided and matches an individual id, start from that individual.
    // If it matches a family id, start from that family's parents (or children if no parents).
    // Otherwise, default to individuals without parents.
    const startingIndividuals: string[] = (() => {
        if (focusItem) {
            if (individualsById.has(focusItem)) return [focusItem];
            const fam = familiesLocal.find((f) => f.id === focusItem);
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
        familiesLocal.forEach((fam) => {
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
    familiesLocal.forEach((f) => {
        (f.children || []).forEach((c: string) => childParentFamily.set(c, f.id));
    });

    familiesLocal.forEach((fam) => {
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

    // Compute positions per person using a strict grid:
    // - Individuals occupy even-numbered rows: personRow = generation * 2
    // - Family boxes occupy the odd row between parents and children: familyRow = generation * 2 + 1
    // Use a slightly smaller row height to make core-family connectors shorter and groups more compact.
    const rowHeight = 90; // px per grid row (reduced from 120)
    
    // Calculate total height accounting for negative generations
    const totalLevels = maxLevel - minLevel;
    const totalHeight = (totalLevels * 2 + 3) * rowHeight; // +3 for padding
    const yOffset = Math.abs(minLevel) * 2 * rowHeight + rowHeight; // offset to move negative generations into positive y space
    const pos: Record<string, { x: number; y: number }> = {};
    const pairOffsetGlobal = 2; // percent used for spouse pair spacing when repositioning

    // Refs to DOM elements so we can measure box heights and compute dynamic offsets
    const personEls = useRef(new Map<string, HTMLDivElement>());
    const familyEls = useRef(new Map<string, HTMLDivElement>());
    const innerRef = useRef<HTMLDivElement | null>(null);
    const containerRectRef = useRef<DOMRect | null>(null);
    const personHalfMap = useRef(new Map<string, number>());
    const familyHalfMap = useRef(new Map<string, number>());
    const personWidthMap = useRef(new Map<string, number>());
    const familyWidthMap = useRef(new Map<string, number>());
    // trigger re-render after measuring
    const [, setMeasuredVersion] = useState(0);

    // Layout by families: group individuals by their parent families and position each family unit
    // (reuse childParentFamily map from above)

    // Find root families (families where parents are not children in another family)
    // When focusItem is set, also include families where the focused person is a child, or if focusItem IS the family
    const rootFamilies = familiesLocal.filter((f) => {
        // If focusItem is this family itself, treat it as a root
        if (focusItem && f.id === focusItem) {
            return true;
        }
        // If focusItem is a child in this family, treat it as a root
        if (focusItem && (f.children || []).includes(focusItem)) {
            return true;
        }
        const parents: string[] = (f.parents || []).slice();
        return !parents.some((p) => childParentFamily.has(p));
    });

    // Recursive function to layout a family and its descendants
    const familyUnitWidth = 200; // px width per family unit (static spacing)
    const pairOffset = 60; // px offset for spouse pairs within a family
    const singleWidth = 100; // px width for a single person
    
    // Dynamically adjust sibling gap based on tree complexity
    // For very wide trees, reduce gaps to make them more compact
    const estimatedTreeWidth = rootFamilies.reduce((sum, f) => {
        const childCount = (f.children || []).length;
        return sum + childCount * 150; // rough estimate
    }, 0);
    const dynamicSiblingGap = estimatedTreeWidth > 5000 ? Math.max(8, siblingGap / 3) : siblingGap;
    
    // Compute required width for a family subtree (sum of child subtree widths or singleWidth)
    const familyWidthMemo = new Map<string, number>();
    function computeFamilyWidth(famId: string, seen = new Set<string>()): number {
        if (familyWidthMemo.has(famId)) return familyWidthMemo.get(famId)!;
        if (seen.has(famId)) return singleWidth; // cycle guard
        seen.add(famId);
        const fam = familiesLocal.find(f => f.id === famId);
        if (!fam) return singleWidth;
        const kids: string[] = (fam.children || []).slice();
        if (kids.length === 0) {
            // If no children, family width should at least cover parent widths
            const parents: string[] = (fam.parents || []).slice();
            const pWidths = parents.map(p => personWidthMap.current.get(p) ?? singleWidth);
            const parentGap = parents.length > 1 ? 40 : 0;
            const w = Math.max(singleWidth, pWidths.reduce((s, v) => s + v, 0) + parentGap + 16);
            familyWidthMemo.set(famId, w);
            return w;
        }
        let total = 0;
        let visibleKids = 0;
        kids.forEach((kid) => {
            const kidLevel = levelOf.get(kid) ?? 0;
            if (kidLevel > (typeof maxGenerationsForward === 'number' ? maxGenerationsForward : Infinity) || kidLevel < -(typeof maxGenerationsBackward === 'number' ? maxGenerationsBackward : Infinity)) {
                // skip descendants/ancestors beyond allowed generations
                return;
            }
            const childFam = familiesLocal.find(f => (f.parents || []).includes(kid));
            if (childFam) {
                total += computeFamilyWidth(childFam.id, new Set(seen));
            } else {
                total += (personWidthMap.current.get(kid) ?? singleWidth);
            }
            visibleKids++;
        });
        // include sibling gaps roughly (use prop)
        const childrenWidth = Math.max(total + Math.max(0, visibleKids - 1) * dynamicSiblingGap, 0);

        // compute parent block width as measured sum of parent boxes + gap (use prop)
        const parents: string[] = (fam.parents || []).slice();
        const pWidths = parents.map(p => personWidthMap.current.get(p) ?? singleWidth);
        const parentBlockWidth = pWidths.reduce((s, v) => s + v, 0) + (parents.length > 0 ? parentGap : 0);

        const w = Math.max(childrenWidth, parentBlockWidth + familyPadding, singleWidth);
        familyWidthMemo.set(famId, w);
        return w;
    }

    function layoutFamily(famId: string, centerX: number, familiesProcessed: Set<string>): number {
        if (familiesProcessed.has(famId)) return 0;
        familiesProcessed.add(famId);
        
        const fam = familiesLocal.find(f => f.id === famId);
        if (!fam) return 0;
        
        const parents: string[] = (fam.parents || []).slice();
        const kids: string[] = (fam.children || []).slice();
        
        // Position parents at their generation
        const parentLevel = parents.length > 0 ? (levelOf.get(parents[0]) ?? 0) : 0;
        const parentRow = parentLevel * 2;
        const parentY = parentRow * rowHeight + rowHeight / 2 + yOffset;
        
        // First, recursively layout parent families (upward traversal)
        parents.forEach((parentId) => {
            const parentFamily = familiesLocal.find(f => (f.children || []).includes(parentId));
            if (parentFamily && !familiesProcessed.has(parentFamily.id)) {
                // Layout the parent's parent family centered above this position
                layoutFamily(parentFamily.id, centerX, familiesProcessed);
            }
        });
        
        // Position parents taking measured widths into account to avoid overlap
        if (parents.length === 1) {
            pos[parents[0]] = { x: centerX, y: parentY };
        } else if (parents.length >= 2) {
            const pWidths = parents.map(p => personWidthMap.current.get(p) ?? singleWidth);
            const parentGap = 40; // desired gap between parent boxes
            const parentsTotalWidth = pWidths.reduce((s, w) => s + w, 0) + parentGap;
            // left edge of parents block
            let px = centerX - parentsTotalWidth / 2;
            parents.forEach((p, i) => {
                const w = pWidths[i];
                const cx = px + w / 2;
                pos[p] = { x: cx, y: parentY };
                px += w + parentGap; // move to next (this leaves extra gap but keeps things simple)
            });
        }
        
        // Position children and their families: compute widths per child so they pack tightly
        if (kids.length === 0) return singleWidth;

        // use prop `siblingGap` for spacing between siblings
        const childInfos = kids.map(kid => {
            const childFam = familiesLocal.find(f => (f.parents || []).includes(kid));
            const width = childFam ? computeFamilyWidth(childFam.id) : singleWidth;
            return { childId: kid, familyId: childFam?.id, width };
        });
        // filter out children beyond allowed forward/backward generations
        const visibleChildInfos = childInfos.filter((info) => {
            const lvl = levelOf.get(info.childId) ?? 0;
            return lvl <= maxGenerationsForward && lvl >= -maxGenerationsBackward;
        });
        const totalChildWidths = visibleChildInfos.reduce((s, c) => s + c.width, 0);
        const totalChildWidth = totalChildWidths + Math.max(0, visibleChildInfos.length - 1) * dynamicSiblingGap;
        let childCursor = centerX - totalChildWidth / 2;

        visibleChildInfos.forEach((info, idx) => {
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

    // Layout all root families side by side using computed widths so the tree is compact
    const familiesProcessed = new Set<string>();
    const rootWidths = rootFamilies.map((f) => computeFamilyWidth(f.id));
    const totalTreeWidth = rootWidths.reduce((s, w) => s + w, 0) || familyUnitWidth;
    let cursor = 0;
    rootFamilies.forEach((fam, idx) => {
        const w = rootWidths[idx] || familyUnitWidth;
        const famCenter = cursor + w / 2;
        layoutFamily(fam.id, famCenter, familiesProcessed);
        cursor += w;
    });

    // FIRST: Find min and max X coordinates from all laid-out positions
    let minX = Infinity;
    let maxX = -Infinity;
    Object.values(pos).forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
    });
    
    // Handle edge case where no positions exist
    if (minX === Infinity || maxX === -Infinity) {
        minX = 0;
        maxX = totalTreeWidth || 1000;
    }
    
    // SECOND: Apply X offset to ensure ALL content is in positive space with padding
    const targetMinX = 100; // Ensure at least 100px left margin
    const xOffset = targetMinX - minX;
    
    // Apply offset to all person positions
    Object.keys(pos).forEach((id) => {
        pos[id].x += xOffset;
    });
    
    // Update min/max after offset
    minX += xOffset;
    maxX += xOffset;

    // THIRD: Build family positions AFTER applying offset to person positions
    const familyPositions: Array<{ id: string; x: number; y: number; parents: string[]; children: string[] }> = [];
    
    // Build a set of valid individual IDs for validation
    const validIndividualIds = new Set(individualsLocal.map(i => i.id));
    
    familiesLocal.forEach((fam) => {
        // Filter out any references to non-existent individuals (corrupt GEDCOM handling)
        const parents: string[] = (fam.parents || []).filter((pid: string) => validIndividualIds.has(pid));
        const kids = (fam.children || []).filter((cid: string) => validIndividualIds.has(cid));

        // compute average positions if available
        const parentPos = parents.map((pid: string) => pos[pid]).filter(Boolean) as { x: number; y: number }[];
        const childPos = kids.map((cid: string) => pos[cid]).filter(Boolean) as { x: number; y: number }[];

        const avg = (arr: { x: number; y: number }[]) => ({ x: arr.reduce((s, a) => s + a.x, 0) / arr.length, y: arr.reduce((s, a) => s + a.y, 0) / arr.length });
        let familyX = 50;
        let familyY = 0;

        // Prefer placing the family box between the parent generation and the child generation
        const parentLevels = parents.map((pid: string) => levelOf.get(pid)).filter((v: unknown): v is number => typeof v === 'number');
        const childLevels = kids.map((cid: string) => levelOf.get(cid)).filter((v: unknown): v is number => typeof v === 'number');

        if (parentPos.length > 0 && parentLevels.length > 0) {
            // Center the family box beneath the parents' average x position.
            const pavg = avg(parentPos);
            familyX = pavg.x;

            // Place family row between parents and children using parent generation.
            const maxParentLevel = Math.max(...parentLevels);
            const familyRow = maxParentLevel * 2 + 1;
            familyY = familyRow * rowHeight + rowHeight / 2 + yOffset;
        } else if (childPos.length > 0) {
            // No parents available (or not positioned) — fall back to centering under children
            const cavg = avg(childPos);
            familyX = cavg.x;
            familyY = cavg.y - rowHeight * 0.4;
        } else {
            // Fallback center (will be adjusted after X offset calculation)
            familyX = totalTreeWidth / 2;
            familyY = rowHeight; // fallback
        }

        // Only include family boxes if we have positioned parents or children (visible within generation limit)
        if (parentPos.length > 0 || childPos.length > 0) {
            familyPositions.push({ id: fam.id, x: familyX, y: familyY, parents, children: kids });
        }
    });

    // Fallback: ensure every individual has a position so connectors always draw,
    // but only assign positions for individuals within the allowed forward generation.
    individuals.forEach((ind) => {
        if (pos[ind.id]) return;
        const lvl = levelOf.get(ind.id) ?? 0;
        if (lvl > maxGenerationsForward || lvl < -maxGenerationsBackward) return; // skip individuals beyond allowed generations

        // Prefer parent's family position if available
        const asParentFam = familiesLocal.find((f) => (f.parents || []).includes(ind.id));
        if (asParentFam) {
            const fp = familyPositions.find((fp) => fp.id === asParentFam.id);
            if (fp) {
                const pLevel = levelOf.get(ind.id) ?? 0;
                const pRow = pLevel * 2;
                pos[ind.id] = { x: fp.x + (/* offset if first/second parent */ 0), y: pRow * rowHeight + rowHeight / 2 + yOffset };
                return;
            }
        }
        // Else prefer child family position
        const asChildFam = familiesLocal.find((f) => (f.children || []).includes(ind.id));
        if (asChildFam) {
            const fp = familyPositions.find((fp) => fp.id === asChildFam.id);
            if (fp) {
                const cLevel = levelOf.get(ind.id) ?? 0;
                const cRow = cLevel * 2;
                pos[ind.id] = { x: fp.x, y: cRow * rowHeight + rowHeight / 2 + yOffset };
                return;
            }
        }
        // Final fallback: center by level
        pos[ind.id] = { x: totalTreeWidth / 2 + xOffset, y: (lvl * 2) * rowHeight + rowHeight / 2 + yOffset };
    });
    
    // Calculate actual tree width from actual positions with padding
    const actualTreeWidth = maxX + 100; // +100 for right padding

    // Debug logging for specific problematic families
    if (typeof window !== 'undefined' && (window as any).DEBUG_POSITIONS) {
        console.log('=== Position Debug ===');
        console.log('F75 family:', familiesLocal.find(f => f.id === 'F75'));
        console.log('F187 family:', familiesLocal.find(f => f.id === 'F187'));
        ['I166', 'I386', 'I168', 'I169'].forEach(id => {
            const inIndividualsLocal = individualsLocal.some(ind => ind.id === id);
            console.log(`${id} in individualsLocal:`, inIndividualsLocal);
            console.log(`${id} position:`, pos[id]);
            console.log(`${id} level:`, levelOf.get(id));
        });
        console.log('F75 in familyPositions:', familyPositions.find(f => f.id === 'F75'));
        console.log('F187 in familyPositions:', familyPositions.find(f => f.id === 'F187'));
        console.log('minX:', minX, 'maxX:', maxX, 'xOffset:', xOffset);
        console.log('actualTreeWidth:', actualTreeWidth);
        console.log('Total in pos:', Object.keys(pos).length, 'Total individualsLocal:', individualsLocal.length);
    }

    // Measure actual DOM heights after mount / updates so connectors meet box edges.
    // Use useLayoutEffect so measurements happen before the browser paints.
    useLayoutEffect(() => {
        const pMap = new Map<string, number>();
        personEls.current.forEach((el, id) => {
            try {
                pMap.set(id, el.clientHeight / 2 || 24);
            } catch {
                pMap.set(id, 24);
            }
        });
        const pWidthMap = new Map<string, number>();
        personEls.current.forEach((el, id) => {
            try {
                pWidthMap.set(id, el.clientWidth || singleWidth);
            } catch {
                pWidthMap.set(id, singleWidth);
            }
        });

        const fMap = new Map<string, number>();
        familyEls.current.forEach((el, id) => {
            try {
                fMap.set(id, el.clientHeight / 2 || 9);
            } catch {
                fMap.set(id, 9);
            }
        });

        const fWidthMap = new Map<string, number>();
        familyEls.current.forEach((el, id) => {
            try {
                fWidthMap.set(id, el.clientWidth || 32);
            } catch {
                fWidthMap.set(id, 32);
            }
        });

        // Only update refs and trigger a re-render if measured values changed
        let changed = false;

        if (pMap.size !== personHalfMap.current.size) changed = true;
        else {
            for (const [k, v] of pMap.entries()) {
                if (personHalfMap.current.get(k) !== v) {
                    changed = true;
                    break;
                }
            }
        }

        if (!changed) {
            if (fMap.size !== familyHalfMap.current.size) changed = true;
            else {
                for (const [k, v] of fMap.entries()) {
                    if (familyHalfMap.current.get(k) !== v) {
                        changed = true;
                        break;
                    }
                }
            }
        }

        if (changed) {
            personHalfMap.current = pMap;
            familyHalfMap.current = fMap;
            personWidthMap.current = pWidthMap;
            familyWidthMap.current = fWidthMap;
            setMeasuredVersion((v) => v + 1);
        }

        // measure and cache container rect for getBoundingClientRect fallbacks
        try {
            if (innerRef.current) {
                containerRectRef.current = innerRef.current.getBoundingClientRect();
            }
        } catch {
            containerRectRef.current = null;
        }

        // Debug: print positions and computed connector endpoints for specific problematic IDs
        if (typeof window !== 'undefined' && (window as any).DEBUG_TREE) {
            const inspect = ['I3', 'I5'];
            console.log('--- Connector debug ---');
            inspect.forEach((id) => {
                console.log(`pos[${id}] =`, pos[id]);
                console.log(`personHalfMap[${id}] =`, personHalfMap.current.get(id));
            const asParentFams = familiesLocal.filter((f) => (f.parents || []).includes(id));
            const asChildFams = familiesLocal.filter((f) => (f.children || []).includes(id));
                asParentFams.forEach((fam) => {
                    const p = pos[id];
                    const perHalf = personHalfMap.current.get(id) ?? 24;
                    const famHalf = familyHalfMap.current.get(fam.id) ?? 9;
                    const x1 = p?.x; const y1 = p ? p.y + perHalf : undefined;
                    const famPos = famPosLookup(fam.id);
                    const x2 = famPos ? famPos.x : undefined;
                    const y2 = famPos ? famPos.y - famHalf : undefined;
                    console.log(`asParent fam ${fam.id} endpoints: p->(${x1},${y1}) fam->(${x2},${y2})`);
                });
                asChildFams.forEach((fam) => {
                    const c = pos[id];
                    const perHalf = personHalfMap.current.get(id) ?? 24;
                    const famHalf = familyHalfMap.current.get(fam.id) ?? 9;
                    const famPos2 = famPosLookup(fam.id);
                    const x1 = famPos2 ? famPos2.x : undefined;
                    const y1 = famPos2 ? famPos2.y + famHalf : undefined;
                    const x2 = c?.x; const y2 = c ? c.y - perHalf : undefined;
                    console.log(`asChild fam ${fam.id} endpoints: fam->(${x1},${y1}) c->(${x2},${y2})`);
                });
            });
            console.log('familyHalfMap sample:', Array.from(fMap.entries()).slice(0,5));
            console.log('--- end connector debug ---');
        }
    }, [individualsLocal, familiesLocal]);

    // helper to find familyPositions entry quickly
    function famPosLookup(id: string) {
        return familyPositions.find((fp) => fp.id === id);
    }

    // Format parsed GEDCOM date object for display (prefer ISO, then approxIso, then original)
    function formatGedcomDateForDisplay(d: any) {
        if (!d) return null;
        return d.iso || d.approxIso || d.original || null;
    }

    return (
        <div className="tree-view" style={{ position: 'relative', width: '100%', minHeight: totalHeight, display: 'flex', justifyContent: 'center' }}>
            <div ref={innerRef} style={{ position: 'relative', width: actualTreeWidth, height: totalHeight }}>
            <svg className="family-connectors" viewBox={`0 0 ${actualTreeWidth} ${totalHeight}`} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: `${totalHeight}px`, pointerEvents: 'none' }}>
                {/* Draw lines parent -> family, family -> child */}
                {familyPositions.map((fam, fi) => (
                    <g key={`fam-${fam.id}`}>
                        {fam.parents.map((pid, pi) => {
                            let p = pos[pid];
                            // fallback to DOM measurement if layout didn't assign pos yet
                            if (!p) {
                                const el = personEls.current.get(pid);
                                const crect = containerRectRef.current;
                                if (el && crect) {
                                    try {
                                        const r = el.getBoundingClientRect();
                                        p = { x: (r.left - crect.left) + r.width / 2, y: (r.top - crect.top) + r.height / 2 };
                                    } catch {
                                        p = { x: el.offsetLeft + el.clientWidth / 2, y: el.offsetTop + el.clientHeight / 2 };
                                    }
                                }
                            }
                            if (!p) return null;
                            const perHalf = personHalfMap.current.get(pid) ?? (personEls.current.get(pid)?.clientHeight ? personEls.current.get(pid)!.clientHeight / 2 : 24);
                            const famHalf = familyHalfMap.current.get(fam.id) ?? 9;
                            const x1 = p.x;
                            const y1 = p.y + perHalf;
                            const x2 = fam.x;
                            const y2 = fam.y - famHalf;
                            return <line key={`pf-${fam.id}-${pi}`} x1={`${x1}`} y1={`${y1}`} x2={`${x2}`} y2={`${y2}`} stroke="#666" strokeWidth={0.6} />;
                        })}
                        {fam.children.map((cid, ci) => {
                            let c = pos[cid];
                            if (!c) {
                                const el = personEls.current.get(cid);
                                const crect = containerRectRef.current;
                                if (el && crect) {
                                    try {
                                        const r = el.getBoundingClientRect();
                                        c = { x: (r.left - crect.left) + r.width / 2, y: (r.top - crect.top) + r.height / 2 };
                                    } catch {
                                        c = { x: el.offsetLeft + el.clientWidth / 2, y: el.offsetTop + el.clientHeight / 2 };
                                    }
                                }
                            }
                            if (!c) return null;
                            const perHalf = personHalfMap.current.get(cid) ?? (personEls.current.get(cid)?.clientHeight ? personEls.current.get(cid)!.clientHeight / 2 : 24);
                            const famHalf = familyHalfMap.current.get(fam.id) ?? 9;
                            const x1 = fam.x;
                            const y1 = fam.y + famHalf;
                            const x2 = c.x;
                            const y2 = c.y - perHalf;
                            return <line key={`fc-${fam.id}-${ci}`} x1={`${x1}`} y1={`${y1}`} x2={`${x2}`} y2={`${y2}`} stroke="#666" strokeWidth={0.6} />;
                        })}
                    </g>
                ))}
            </svg>

            {/* Render person boxes once each */}
            {individualsLocal.map((ind) => {
                const p = pos[ind.id];
                if (!p) return null;
                const birth = formatGedcomDateForDisplay(ind.birthDate);
                const death = formatGedcomDateForDisplay(ind.deathDate);
                const dateLine = birth || death ? `${birth ? `b. ${birth}` : ''}${birth && death ? ' — ' : ''}${death ? `d. ${death}` : ''}` : null;

                try {
                    if (typeof window !== 'undefined' && (window as any).SHOW_PERSON_RENDER_LOGS) {
                        // eslint-disable-next-line no-console
                        console.log('render person (tree):', ind.id, { birthDate: ind.birthDate, deathDate: ind.deathDate });
                    }
                } catch {}
                return (
                    <div
                        key={ind.id}
                        className={`person-box ${ind.families && ind.families.length ? 'parent' : 'standalone'} ${selectedId === ind.id ? 'selected' : ''}`}
                        style={{ left: `${p.x}px`, top: p.y, transform: 'translate(-50%, -50%)', position: 'absolute' }}
                        onClick={() => onSelectPerson?.(ind.id)}
                        title={ind.name || ind.id}
                        ref={(el) => {
                            if (el) personEls.current.set(ind.id, el);
                            else personEls.current.delete(ind.id);
                        }}
                        data-person-id={ind.id}
                    >
                        <div className="person-name">{ind.name || ind.id}</div>
                        {dateLine && <div className="person-dates">{dateLine}</div>}
                        <div style={{ fontSize: 10, color: '#666' }}>{ind.id}</div>
                    </div>
                );
            })}
            {/* Render family boxes */}
            {familyPositions.map((fam) => (
                <div
                    key={`fambox-${fam.id}`}
                    className="family-box"
                    style={{ left: `${fam.x}px`, top: fam.y, transform: 'translate(-50%, -50%)', position: 'absolute' }}
                    onClick={() => onSelectFamily?.(fam.id)}
                    title={fam.id}
                    ref={(el) => {
                        if (el) familyEls.current.set(fam.id, el);
                        else familyEls.current.delete(fam.id);
                    }}
                    data-family-id={fam.id}
                >
                    {fam.id}
                </div>
            ))}
            </div>
        </div>
    );
};

export default TreeView;