import React, { useLayoutEffect, useRef, useState } from 'react';
import { assignGenerations } from './utils/generationAssignment';
import { createFamilyWidthCalculator } from './utils/familyWidthCalculation';
import { createFamilyLayouter, applyXOffset } from './utils/familyLayout';
import { filterByMaxTrees, buildRelationshipMaps } from './utils/treeFiltering';
import { ConnectionLines } from './ConnectionLines';

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
    selectedTreeIndex?: number; // which tree component to display (0 = largest, default)
}

// Render a single tree: each person is one node placed by generation (distance from root)
export const TreeView: React.FC<TreeViewProps> = ({ individuals, families = [], selectedId, onSelectPerson, onSelectFamily, siblingGap = 28, parentGap = 40, familyPadding = 16, focusItem = null, maxGenerationsForward = 100, maxGenerationsBackward = 10, selectedTreeIndex }) => {
    // Filter to selected tree component (defaults to largest if not specified)
    const { individualsLocal, familiesLocal } = filterByMaxTrees({ individuals, families, selectedTreeIndex });
    
    // Build parent -> children edges from families
    const { childrenOf, parentsOf } = buildRelationshipMaps(familiesLocal);

    const individualsById = new Map<string, any>(individualsLocal.map((i) => [i.id, i]));

    // Assign generation levels using BFS
    const { levelOf, minLevel, maxLevel, levels } = assignGenerations({
        individualsLocal,
        familiesLocal,
        childrenOf,
        parentsOf,
        individualsById,
        focusItem
    });

    // Refs to DOM elements so we can measure box heights and compute dynamic offsets
    const personEls = useRef(new Map<string, HTMLDivElement>());
    const familyEls = useRef(new Map<string, HTMLDivElement>());
    const innerRef = useRef<HTMLDivElement | null>(null);
    const containerRectRef = useRef<DOMRect | null>(null);
    const personHalfMap = useRef(new Map<string, number>());
    const familyHalfMap = useRef(new Map<string, number>());
    const personWidthMap = useRef(new Map<string, number>());
    const familyWidthMap = useRef(new Map<string, number>());
    const [, setMeasuredVersion] = useState(0);

    // Calculate dimensions
    const rowHeight = 90;
    const totalLevels = maxLevel - minLevel;
    const totalHeight = (totalLevels * 2 + 3) * rowHeight;
    const yOffset = Math.abs(minLevel) * 2 * rowHeight + rowHeight;
    const singleWidth = 100;
    
    // Find root families (families where parents are not children in another family)
    // When focusItem is set, also include families where the focused person is a child, or if focusItem IS the family
    const childParentFamily = new Map<string, string>();
    familiesLocal.forEach((f) => {
        (f.children || []).forEach((c: string) => childParentFamily.set(c, f.id));
    });
    
    const rootFamilies = familiesLocal.filter((f) => {
        if (focusItem && f.id === focusItem) return true;
        if (focusItem && (f.children || []).includes(focusItem)) return true;
        const parents: string[] = (f.parents || []).slice();
        return !parents.some((p) => childParentFamily.has(p));
    });

    // Estimate tree width for dynamic sibling gap
    const estimatedTreeWidth = rootFamilies.reduce((sum, f) => {
        const childCount = (f.children || []).length;
        return sum + childCount * 150;
    }, 0);
    const dynamicSiblingGap = estimatedTreeWidth > 5000 ? Math.max(8, siblingGap / 3) : siblingGap;
    
    // Create family width calculator
    const computeFamilyWidth = createFamilyWidthCalculator({
        familiesLocal,
        levelOf,
        personWidthMap: personWidthMap.current,
        maxGenerationsForward,
        maxGenerationsBackward,
        singleWidth,
        siblingGap: dynamicSiblingGap,
        parentGap,
        familyPadding
    });
    
    // Create layout function
    const { layoutFamily, pos } = createFamilyLayouter({
        familiesLocal,
        levelOf,
        computeFamilyWidth,
        personWidthMap: personWidthMap.current,
        maxGenerationsForward,
        maxGenerationsBackward,
        rowHeight,
        yOffset,
        singleWidth,
        dynamicSiblingGap
    });
    
    // Layout all root families side by side
    const familiesProcessed = new Set<string>();
    const rootWidths = rootFamilies.map((f) => computeFamilyWidth(f.id));
    const totalTreeWidth = rootWidths.reduce((s, w) => s + w, 0) || 200;
    let cursor = 0;
    rootFamilies.forEach((fam, idx) => {
        const w = rootWidths[idx] || 200;
        const famCenter = cursor + w / 2;
        layoutFamily(fam.id, famCenter, familiesProcessed);
        cursor += w;
    });

    // Apply X offset to ensure positive space
    const { pos: finalPos, minX, maxX } = applyXOffset(pos, 100);
    const actualTreeWidth = maxX + 100;

    // Build family positions AFTER applying offset to person positions
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
                finalPos[ind.id] = { x: fp.x + (/* offset if first/second parent */ 0), y: pRow * rowHeight + rowHeight / 2 + yOffset };
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
                finalPos[ind.id] = { x: fp.x, y: cRow * rowHeight + rowHeight / 2 + yOffset };
                return;
            }
        }
        // Final fallback: center by level
        finalPos[ind.id] = { x: actualTreeWidth / 2, y: (lvl * 2) * rowHeight + rowHeight / 2 + yOffset };
    });
    


    // Debug logging for specific problematic families
    if (typeof window !== 'undefined' && (window as any).DEBUG_POSITIONS) {
        console.log('=== Position Debug ===');
        console.log('F75 family:', familiesLocal.find(f => f.id === 'F75'));
        console.log('F187 family:', familiesLocal.find(f => f.id === 'F187'));
        ['I166', 'I386', 'I168', 'I169'].forEach(id => {
            const inIndividualsLocal = individualsLocal.some(ind => ind.id === id);
            console.log(`${id} in individualsLocal:`, inIndividualsLocal);
            console.log(`${id} position:`, finalPos[id]);
            console.log(`${id} level:`, levelOf.get(id));
        });
        console.log('F75 in familyPositions:', familyPositions.find(f => f.id === 'F75'));
        console.log('F187 in familyPositions:', familyPositions.find(f => f.id === 'F187'));
        console.log('minX:', minX, 'maxX:', maxX);
        console.log('actualTreeWidth:', actualTreeWidth);
        console.log('Total in finalPos:', Object.keys(finalPos).length, 'Total individualsLocal:', individualsLocal.length);
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
            <ConnectionLines
                familyPositions={familyPositions}
                pos={finalPos}
                personEls={personEls}
                personHalfMap={personHalfMap}
                familyHalfMap={familyHalfMap}
                containerRectRef={containerRectRef}
                actualTreeWidth={actualTreeWidth}
                totalHeight={totalHeight}
            />

            {/* Render person boxes once each */}
            {individualsLocal.map((ind) => {
                const p = finalPos[ind.id];
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