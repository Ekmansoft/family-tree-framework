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
}

// Render a single tree: each person is one node placed by generation (distance from root)
export const TreeView: React.FC<TreeViewProps> = ({ individuals, families = [], selectedId, onSelectPerson, onSelectFamily, siblingGap = 28, parentGap = 40, familyPadding = 16 }) => {
    // Build quick lookup maps
    const individualsById = new Map<string, any>(individuals.map((i) => [i.id, i]));

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

    // Find roots (people without parents)
    const roots = individuals.filter((i) => !parentsOf.has(i.id)).map((i) => i.id);

    // BFS to assign generation levels
    const levelOf = new Map<string, number>();
    const queue: string[] = [];
    roots.forEach((r) => {
        levelOf.set(r, 0);
        queue.push(r);
    });

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

    // Any individuals not reached (cycles or disconnected) -> put at level 0
    individuals.forEach((i) => {
        if (!levelOf.has(i.id)) levelOf.set(i.id, 0);
    });

    // Propagate levels between spouses/parents and children so spouses are placed on the same generation
    // and children are placed one generation below. Iterate until fixed point (small number of passes).
    for (let iter = 0; iter < 8; iter++) {
        let changed = false;
        families.forEach((fam) => {
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
    families.forEach((f) => {
        (f.children || []).forEach((c: string) => childParentFamily.set(c, f.id));
    });

    families.forEach((fam) => {
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
    let maxLevel = 0;
    levelOf.forEach((lvl, id) => {
        if (!levels.has(lvl)) levels.set(lvl, []);
        levels.get(lvl)!.push(id);
        if (lvl > maxLevel) maxLevel = lvl;
    });

    // Compute positions per person using a strict grid:
    // - Individuals occupy even-numbered rows: personRow = generation * 2
    // - Family boxes occupy the odd row between parents and children: familyRow = generation * 2 + 1
    // Use a slightly smaller row height to make core-family connectors shorter and groups more compact.
    const rowHeight = 90; // px per grid row (reduced from 120)
    const totalHeight = (maxLevel * 2 + 1) * rowHeight;
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
    const rootFamilies = families.filter((f) => {
        const parents: string[] = (f.parents || []).slice();
        return !parents.some((p) => childParentFamily.has(p));
    });

    // Recursive function to layout a family and its descendants
    const familyUnitWidth = 200; // px width per family unit (static spacing)
    const pairOffset = 60; // px offset for spouse pairs within a family
    const singleWidth = 100; // px width for a single person
    
    // Compute required width for a family subtree (sum of child subtree widths or singleWidth)
    const familyWidthMemo = new Map<string, number>();
    function computeFamilyWidth(famId: string, seen = new Set<string>()): number {
        if (familyWidthMemo.has(famId)) return familyWidthMemo.get(famId)!;
        if (seen.has(famId)) return singleWidth; // cycle guard
        seen.add(famId);
        const fam = families.find(f => f.id === famId);
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
        kids.forEach((kid) => {
            const childFam = families.find(f => (f.parents || []).includes(kid));
            if (childFam) {
                total += computeFamilyWidth(childFam.id, new Set(seen));
            } else {
                total += (personWidthMap.current.get(kid) ?? singleWidth);
            }
        });
        // include sibling gaps roughly (use prop)
        const childrenWidth = Math.max(total + Math.max(0, kids.length - 1) * siblingGap, 0);

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
        
        const fam = families.find(f => f.id === famId);
        if (!fam) return 0;
        
        const parents: string[] = (fam.parents || []).slice();
        const kids: string[] = (fam.children || []).slice();
        
        // Position parents at their generation
        const parentLevel = parents.length > 0 ? (levelOf.get(parents[0]) ?? 0) : 0;
        const parentRow = parentLevel * 2;
        const parentY = parentRow * rowHeight + rowHeight / 2;
        
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
            const childFam = families.find(f => (f.parents || []).includes(kid));
            const width = childFam ? computeFamilyWidth(childFam.id) : singleWidth;
            return { childId: kid, familyId: childFam?.id, width };
        });

        const totalChildWidths = childInfos.reduce((s, c) => s + c.width, 0);
        const totalChildWidth = totalChildWidths + Math.max(0, childInfos.length - 1) * siblingGap;
        let childCursor = centerX - totalChildWidth / 2;

        childInfos.forEach((info, idx) => {
            const childCenter = childCursor + info.width / 2;
            const childLevel = levelOf.get(info.childId) ?? 0;
            const childRow = childLevel * 2;
            const childY = childRow * rowHeight + rowHeight / 2;

            if (info.familyId) {
                layoutFamily(info.familyId, childCenter, familiesProcessed);
            } else {
                pos[info.childId] = { x: childCenter, y: childY };
            }

            // advance cursor by this child's width plus gap (except after last)
            childCursor += info.width + (idx < childInfos.length - 1 ? siblingGap : 0);
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
    
    // Calculate the offset to center the tree (convert px positions to centered layout)
    const treeOffsetX = 0; // Will be handled by container centering

    // Build edges parent->child for drawing via family boxes
    const familyPositions: Array<{ id: string; x: number; y: number; parents: string[]; children: string[] }> = [];
    families.forEach((fam) => {
        const parents: string[] = (fam.parents || []).slice();
        const kids = (fam.children || []).slice();

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
            familyY = familyRow * rowHeight + rowHeight / 2;
        } else if (childPos.length > 0) {
            // No parents available (or not positioned) — fall back to centering under children
            const cavg = avg(childPos);
            familyX = cavg.x;
            familyY = cavg.y - rowHeight * 0.4;
        } else {
            // Fallback center
            familyX = totalTreeWidth / 2;
            familyY = rowHeight; // fallback
        }

        familyPositions.push({ id: fam.id, x: familyX, y: familyY, parents, children: kids });
    });

    // Fallback: ensure every individual has a position so connectors always draw.
    individuals.forEach((ind) => {
        if (pos[ind.id]) return;
        // Prefer parent's family position if available
        const asParentFam = families.find((f) => (f.parents || []).includes(ind.id));
        if (asParentFam) {
            const fp = familyPositions.find((fp) => fp.id === asParentFam.id);
            if (fp) {
                const pLevel = levelOf.get(ind.id) ?? 0;
                const pRow = pLevel * 2;
                pos[ind.id] = { x: fp.x + (/* offset if first/second parent */ 0), y: pRow * rowHeight + rowHeight / 2 };
                return;
            }
        }
        // Else prefer child family position
        const asChildFam = families.find((f) => (f.children || []).includes(ind.id));
        if (asChildFam) {
            const fp = familyPositions.find((fp) => fp.id === asChildFam.id);
            if (fp) {
                const cLevel = levelOf.get(ind.id) ?? 0;
                const cRow = cLevel * 2;
                pos[ind.id] = { x: fp.x, y: cRow * rowHeight + rowHeight / 2 };
                return;
            }
        }
        // Final fallback: center by level
        const lvl = levelOf.get(ind.id) ?? 0;
        pos[ind.id] = { x: totalTreeWidth / 2, y: (lvl * 2) * rowHeight + rowHeight / 2 };
    });

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
                const asParentFams = families.filter((f) => (f.parents || []).includes(id));
                const asChildFams = families.filter((f) => (f.children || []).includes(id));
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
    }, [individuals, families]);

    // helper to find familyPositions entry quickly
    function famPosLookup(id: string) {
        return familyPositions.find((fp) => fp.id === id);
    }

    return (
        <div className="tree-view" style={{ position: 'relative', width: '100%', minHeight: totalHeight, display: 'flex', justifyContent: 'center' }}>
            <div ref={innerRef} style={{ position: 'relative', width: totalTreeWidth, height: totalHeight }}>
            <svg className="family-connectors" viewBox={`0 0 ${totalTreeWidth} ${totalHeight}`} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: `${totalHeight}px`, pointerEvents: 'none' }}>
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
            {individuals.map((ind) => {
                const p = pos[ind.id];
                if (!p) return null;
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