import React, { useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react';
import { assignGenerations } from './utils/generationAssignment';
import { filterByMaxTrees, buildRelationshipMaps as buildPersonRelationshipMaps } from './utils/treeFiltering';
import { buildRelationshipMaps as buildFamilyRelationshipMaps } from './utils/relationshipMaps';
import type { Individual, Family } from './types';
import { debounce } from '../../utils/helpers';
import { VerticalTreeLayout } from './layouts/VerticalTreeLayout';

interface VerticalTreeViewProps {
    individuals: Individual[];
    families?: Family[];
    selectedId?: string | null;
    onSelectPerson?: (id: string) => void;
    onSelectFamily?: (id: string) => void;
    // spacing props (optional)
    siblingGap?: number; // px gap between sibling child blocks
    parentGap?: number; // px gap between parent boxes (spouses) - default 20
    ancestorFamilyGap?: number; // px gap between ancestor family units - default 40
    descendantFamilyGap?: number; // px gap between descendant family units - default 40
    familyPadding?: number; // extra padding when sizing family blocks
    focusItem?: string | null; // id of person or family where decoding starts
    maxGenerationsForward?: number; // how many younger generations to render (forward)
    maxGenerationsBackward?: number; // how many older generations to render (backward)
    selectedTreeIndex?: number; // which tree component to display (0 = largest, default)
    onPerformanceMetric?: (metricName: string, durationMs: number) => void; // optional performance callback
    enableVirtualRendering?: boolean; // enable viewport-based rendering for large trees
    onBounds?: (width: number, height: number) => void; // report computed content bounds
}

// Render a single tree: each person is one node placed by generation (distance from root)
export const VerticalTreeView: React.FC<VerticalTreeViewProps> = ({
    individuals,
    families = [],
    selectedId,
    onSelectPerson,
    onSelectFamily,
    siblingGap = 20,
    parentGap = 20,
    ancestorFamilyGap = 40,
    descendantFamilyGap = 40,
    familyPadding = 16,
    maxGenerationsForward = 2,
    maxGenerationsBackward = 2,
    selectedTreeIndex,
    onPerformanceMetric,
    enableVirtualRendering = false
    , onBounds
}) => {
    const perfStart = (label: string) => onPerformanceMetric ? performance.now() : 0;
    const perfEnd = (label: string, start: number) => {
        if (onPerformanceMetric && start > 0) {
            onPerformanceMetric(label, performance.now() - start);
        }
    };
    
    // If selectedId is provided, traverse from that person within generation limits
    // Otherwise, use tree component filtering
    let individualsLocal = individuals;
    let familiesLocal = families;
    
    if (selectedId) {
        const traversalStart = perfStart('traversal');
        // Build relationship maps from all data
        const individualById = new Map(individuals.map(i => [i.id, i]));
        const familyById = new Map(families.map(f => [f.id, f]));
        
        // Build maps: person -> families where they are a child/parent
        const { personToChildFamilies, personToParentFamilies } = buildFamilyRelationshipMaps(families);
        
        const reachableIndividuals = new Set<string>();
        const reachableFamilies = new Set<string>();
        
        // Start from selected person (generation 0)
        reachableIndividuals.add(selectedId);
        
        // Traverse BACKWARD (ancestors)
        let currentGeneration = new Set([selectedId]);
        for (let gen = 0; gen < maxGenerationsBackward; gen++) {
            const nextGeneration = new Set<string>();
            
            currentGeneration.forEach(personId => {
                // Find families where this person is a child
                const parentFamilies = personToChildFamilies.get(personId) || [];
                parentFamilies.forEach(famId => {
                    reachableFamilies.add(famId);
                    const fam = familyById.get(famId);
                    if (fam) {
                        // Add all parents
                        (fam.parents || []).forEach((parentId: string) => {
                            reachableIndividuals.add(parentId);
                            nextGeneration.add(parentId);
                            // Also add families where these parents are parents (their spouse families)
                            (personToParentFamilies.get(parentId) || []).forEach(spouseFamId => {
                                reachableFamilies.add(spouseFamId);
                            });
                        });
                        // Add all siblings from this family
                        (fam.children || []).forEach((siblingId: string) => {
                            reachableIndividuals.add(siblingId);
                            // Add siblings' families (their spouses and children)
                            const siblingFamilies = personToParentFamilies.get(siblingId) || [];
                            siblingFamilies.forEach(siblingFamId => {
                                reachableFamilies.add(siblingFamId);
                                const sibFam = familyById.get(siblingFamId);
                                if (sibFam) {
                                    // Add sibling's spouses
                                    (sibFam.parents || []).forEach((spouseId: string) => {
                                        reachableIndividuals.add(spouseId);
                                    });
                                    // Add sibling's children
                                    (sibFam.children || []).forEach((childId: string) => {
                                        reachableIndividuals.add(childId);
                                    });
                                }
                            });
                        });
                    }
                });
            });
            
            currentGeneration = nextGeneration;
        }
        
        // Traverse FORWARD (descendants)
        currentGeneration = new Set([selectedId]);
        for (let gen = 0; gen < maxGenerationsForward; gen++) {
            const nextGeneration = new Set<string>();
            
            currentGeneration.forEach(personId => {
                // Find families where this person is a parent
                const childFamilies = personToParentFamilies.get(personId) || [];
                childFamilies.forEach(famId => {
                    reachableFamilies.add(famId);
                    const fam = familyById.get(famId);
                    if (fam) {
                        // Add all parents (spouses) of the current person
                        (fam.parents || []).forEach((parentId: string) => {
                            reachableIndividuals.add(parentId);
                        });
                        // Add children but DON'T continue traversing through siblings
                        (fam.children || []).forEach((childId: string) => {
                            reachableIndividuals.add(childId);
                            // Only continue traversing if this is in the direct line
                            // For now, we'll add all children to continue traversal
                            // but we should only traverse through the selected child's line
                            nextGeneration.add(childId);
                        });
                    }
                });
            });
            
            currentGeneration = nextGeneration;
        }
        
        // Filter to reachable individuals and families
        individualsLocal = individuals.filter(i => reachableIndividuals.has(i.id));
        familiesLocal = families.filter((f: any) => reachableFamilies.has(f.id));
        
        perfEnd('traversal', traversalStart);
        
        if (typeof window !== 'undefined' && (window as any).DEBUG_LAYOUT) {
            console.log(`Filtered to ${individualsLocal.length} individuals and ${familiesLocal.length} families`);
            console.log(`Reachable families:`, Array.from(reachableFamilies).sort());
        }
    } else {
        // No selection - use tree component filtering
        const result = filterByMaxTrees({ 
            individuals, 
            families, 
            selectedTreeIndex,
            focusItemId: null 
        });
        individualsLocal = result.individualsLocal;
        familiesLocal = result.familiesLocal;
    }
    
    // Build parent -> children edges from families
    const { childrenOf, parentsOf } = buildPersonRelationshipMaps(familiesLocal);

    const individualsById = new Map<string, any>(individualsLocal.map((i) => [i.id, i]));

    // Assign generation levels using BFS
    const genStart = perfStart('generation-assignment');
    const { levelOf, minLevel, maxLevel, levels } = assignGenerations({
        individualsLocal,
        familiesLocal,
        childrenOf,
        parentsOf,
        individualsById,
        focusItem: selectedId ?? null
    });
    perfEnd('generation-assignment', genStart);
    
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

    // Calculate dimensions for individual positioning (used by layout strategy)
    const rowHeight = 90;
    const totalLevels = maxLevel - minLevel;
    const yOffset = Math.abs(minLevel) * 2 * rowHeight + rowHeight;
    const singleWidth = 100;
    
    // Find root families (families where parents are not children in another family)
    const childParentFamily = new Map<string, string>();
    familiesLocal.forEach((f) => {
        (f.children || []).forEach((c: string) => childParentFamily.set(c, f.id));
    });
    
    const rootFamilies = familiesLocal.filter((f) => {
        const parents: string[] = (f.parents || []).slice();
        return !parents.some((p) => childParentFamily.has(p));
    });
    
    // Debug logging for root families
    if (typeof window !== 'undefined' && (window as any).DEBUG_TREE) {
        console.log(`Found ${rootFamilies.length} root families:`, rootFamilies.map(f => f.id));
        rootFamilies.forEach(f => {
            console.log(`  Root family ${f.id}: parents=[${(f.parents || []).join(', ')}], children=[${(f.children || []).join(', ')}]`);
        });
    }

    // Use VerticalTreeLayout strategy for computing positions
    const layoutStart = perfStart('layout-computation');
    const layoutStrategy = useMemo(() => new VerticalTreeLayout(), []);
    
    const layoutResult = useMemo(() => {
        return layoutStrategy.computeLayout(
            individualsLocal,
            familiesLocal,
            levelOf,
            {
                siblingGap,
                parentGap,
                familyPadding,
                maxGenerationsForward,
                maxGenerationsBackward,
                simplePacking: true // Enable simple packing mode
            } as any
        );
    }, [layoutStrategy, individualsLocal, familiesLocal, levelOf, siblingGap, parentGap, familyPadding, maxGenerationsForward, maxGenerationsBackward]);
    perfEnd('layout-computation', layoutStart);
    
    const { personPositions: finalPos, familyPositions, bounds } = layoutResult;
    const actualTreeWidth = bounds.width;
    const totalHeight = bounds.height;
    
    // Legacy alias for old code (TODO: refactor and remove)
    const pos = finalPos;
    
    // Report bounds when they change
    React.useEffect(() => {
        try { onBounds && onBounds(actualTreeWidth, totalHeight); } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actualTreeWidth, totalHeight]);

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
        <div className="tree-view" style={{ position: 'relative', width: '100%', minHeight: totalHeight, display: 'block' }}>
            <div ref={innerRef} style={{ position: 'relative', width: actualTreeWidth, height: totalHeight }}>
            <svg 
                className="family-connectors" 
                viewBox={`0 0 ${actualTreeWidth} ${totalHeight}`} 
                style={{ 
                    position: 'absolute', 
                    left: 0, 
                    top: 0, 
                    width: '100%', 
                    height: `${totalHeight}px`, 
                    pointerEvents: 'none' 
                }}
            >
                {familyPositions.map((fam) => (
                    <g key={`fam-${fam.id}`}>
                        {fam.parents.map((pid, pi) => {
                            let p = finalPos[pid];
                            if (!p) {
                                const el = personEls.current.get(pid);
                                const crect = containerRectRef.current;
                                if (el && crect) {
                                    try {
                                        const r = el.getBoundingClientRect();
                                        p = { 
                                            x: (r.left - crect.left) + r.width / 2, 
                                            y: (r.top - crect.top) + r.height / 2 
                                        };
                                    } catch {
                                        p = { 
                                            x: el.offsetLeft + el.clientWidth / 2, 
                                            y: el.offsetTop + el.clientHeight / 2 
                                        };
                                    }
                                }
                            }
                            if (!p) return null;

                            const perHalf = personHalfMap.current.get(pid) ?? 
                                (personEls.current.get(pid)?.clientHeight 
                                    ? personEls.current.get(pid)!.clientHeight / 2 
                                    : 24);
                            const famHalf = familyHalfMap.current.get(fam.id) ?? 9;
                            const x1 = p.x;
                            const y1 = p.y + perHalf;
                            const x2 = fam.x;
                            const y2 = fam.y - famHalf;

                            return (
                                <line 
                                    key={`pf-${fam.id}-${pi}`} 
                                    x1={`${x1}`} 
                                    y1={`${y1}`} 
                                    x2={`${x2}`} 
                                    y2={`${y2}`} 
                                    stroke="#666" 
                                    strokeWidth={0.6} 
                                />
                            );
                        })}

                        {fam.children.map((cid, ci) => {
                            let c = finalPos[cid];
                            if (!c) {
                                const el = personEls.current.get(cid);
                                const crect = containerRectRef.current;
                                if (el && crect) {
                                    try {
                                        const r = el.getBoundingClientRect();
                                        c = { 
                                            x: (r.left - crect.left) + r.width / 2, 
                                            y: (r.top - crect.top) + r.height / 2 
                                        };
                                    } catch {
                                        c = { 
                                            x: el.offsetLeft + el.clientWidth / 2, 
                                            y: el.offsetTop + el.clientHeight / 2 
                                        };
                                    }
                                }
                            }
                            if (!c) return null;

                            const perHalf = personHalfMap.current.get(cid) ?? 
                                (personEls.current.get(cid)?.clientHeight 
                                    ? personEls.current.get(cid)!.clientHeight / 2 
                                    : 24);
                            const famHalf = familyHalfMap.current.get(fam.id) ?? 9;
                            const x1 = fam.x;
                            const y1 = fam.y + famHalf;
                            const x2 = c.x;
                            const y2 = c.y - perHalf;

                            return (
                                <line 
                                    key={`fc-${fam.id}-${ci}`} 
                                    x1={`${x1}`} 
                                    y1={`${y1}`} 
                                    x2={`${x2}`} 
                                    y2={`${y2}`} 
                                    stroke="#666" 
                                    strokeWidth={0.6} 
                                />
                            );
                        })}
                    </g>
                ))}
            </svg>

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
                const genderClass = ind.gender === 'M' ? 'male' : ind.gender === 'F' ? 'female' : 'unknown';
                return (
                    <div
                        key={ind.id}
                        className={`person-box ${ind.families && ind.families.length ? 'parent' : 'standalone'} ${selectedId === ind.id ? 'selected' : ''} ${genderClass}`}
                        style={{ left: `${p.x}px`, top: p.y, transform: 'translate(-50%, -50%)', position: 'absolute' }}
                        onClick={() => onSelectPerson?.(ind.id)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelectPerson?.(ind.id);
                            }
                        }}
                        title={ind.name || ind.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${ind.name || ind.id}${dateLine ? `, ${dateLine}` : ''}`}
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
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectFamily?.(fam.id);
                        }
                    }}
                    title={fam.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Family ${fam.id}`}
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

export default VerticalTreeView;