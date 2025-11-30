import React, { useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react';
import { assignGenerations } from './utils/generationAssignment';
import './vertical.css';
import { filterByMaxTrees, buildRelationshipMaps as buildPersonRelationshipMaps } from './utils/treeFiltering';
import { buildRelationshipMaps as buildFamilyRelationshipMaps } from './utils/relationshipMaps';
import type { Individual, Family, TreeViewCommonProps } from './types';
import { debounce } from '../../utils/helpers';
import { VerticalTreeLayout } from './layouts/VerticalTreeLayout';
import { Renderer } from './Shared/Renderer';

interface VerticalTreeViewProps extends TreeViewCommonProps {
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
    onBounds?: (width: number, height: number) => void; // from common props
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
    enableVirtualRendering = false,
    boxWidth = 100,
    boxHeight = 40,
    familyToParentDistance,
    familyToChildrenDistance,
    onBounds
}) => {
    // Default family distances to boxHeight for consistent vertical spacing
    const effectiveFamilyToParentDistance = familyToParentDistance ?? boxHeight;
    const effectiveFamilyToChildrenDistance = familyToChildrenDistance ?? boxHeight;
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
    const [, setMeasuredVersion] = useState(0); // Shared renderer will handle DOM measurement when enabled

    // Calculate dimensions for individual positioning (used by layout strategy)
    const rowHeight = 90;
    const totalLevels = maxLevel - minLevel;
    const yOffset = Math.abs(minLevel) * 2 * rowHeight + rowHeight;
    const singleWidth = boxWidth;
    
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
                simplePacking: true, // Enable simple packing mode
                boxWidth,
                boxHeight,
                horizontalGap: siblingGap, // Use siblingGap as horizontalGap for now
                familyToParentDistance: effectiveFamilyToParentDistance,
                familyToChildrenDistance: effectiveFamilyToChildrenDistance
            } as any
        );
    }, [layoutStrategy, individualsLocal, familiesLocal, levelOf, siblingGap, parentGap, familyPadding, maxGenerationsForward, maxGenerationsBackward, boxWidth, boxHeight, effectiveFamilyToParentDistance, effectiveFamilyToChildrenDistance]);
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

    // Connector alignment and measurement handled by shared renderer
    useLayoutEffect(() => {
        // This logic is now handled by the Renderer component
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
        <Renderer
            individuals={individualsLocal}
            layout={layoutResult as any}
            selectedId={selectedId}
            onSelectPerson={onSelectPerson}
            onSelectFamily={onSelectFamily}
            onBounds={onBounds}
            boxWidth={boxWidth}
            boxHeight={boxHeight}
            enableConnectorEdgeAlignment={true}
        />
    );
};

export default VerticalTreeView;