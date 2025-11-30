/**
 * AncestorTreeLayout
 * Computes a left-to-right ancestor tree where each generation is a column.
 * Parents are placed so their vertical midpoint equals the child vertical position
 * (symmetrical about child's y). Vertical spacing expands per generation to avoid overlap.
 */
import { TreeLayoutStrategy, LayoutConfig, LayoutResult } from './types';

interface BuildContext {
    personToParentFamily: Map<string, any>; // childId -> family containing parents
    individualById: Map<string, any>;
    maxAncestors: number;
    horizontalGap: number;
    positions: Record<string, { x: number; y: number }>
    // connections (no placeholders)
    connections: Array<{ from: string; to: string; genderHint?: 'M' | 'F' | 'U' }>; // child -> parent links
}

export class AncestorTreeLayout implements TreeLayoutStrategy {
    computeLayout(
        individuals: any[],
        families: any[],
        levelOf: Map<string, number>, // unused for ancestor logic but kept for interface
        config: LayoutConfig
    ): LayoutResult {
        const maxAncestors = config.maxAncestors ?? config.maxGenerationsBackward ?? 7;
        const horizontalGap = (config as any).horizontalGap ?? 180;
        const boxHeight = (config as any).boxHeight ?? 30;

        // Build lookup maps for ancestry traversal
        const individualById = new Map(individuals.map(i => [i.id, i]));
        const personToParentFamily = new Map<string, any>();
        families.forEach(f => (f.children || []).forEach((cid: string) => personToParentFamily.set(cid, f)));

        // Determine root person from levelOf map or first individual
        let selectedId: string | undefined;
        for (const [id, lvl] of levelOf.entries()) { if (lvl === 0) { selectedId = id; break; } }
        if (!selectedId && individuals.length) selectedId = individuals[0].id;
        if (!selectedId) {
            return { personPositions: {}, familyPositions: [], bounds: { width: 200, height: 200, minX: 0, maxX: 200, minY: 0, maxY: 200 } };
        }

        const ctx: BuildContext = {
            personToParentFamily,
            individualById,
            maxAncestors,
            horizontalGap,
            positions: {},
            connections: []
        };

        // Fixed-position algorithm:
        // 1. Calculate max height from deepest generation: 2^maxAncestors * (boxHeight + verticalGap)
        // 2. Place start person at center (y=0)
        // 3. Each generation's parents are spaced at maxHeight / 2^generation intervals
        const verticalGap = (config as any).verticalGap ?? 16; // spacing between boxes (configurable)
        const unitHeight = boxHeight + verticalGap;
        const maxParentsInOldest = Math.pow(2, maxAncestors);
        const maxHeight = maxParentsInOldest * unitHeight;

        // Start person at center
        ctx.positions[selectedId] = { x: 0, y: 0 };

        // Track generation assignments for spacing calculation
        const generationMap: Map<string, number> = new Map();
        generationMap.set(selectedId, 0);

        let currentGen: Array<{ id: string; gender?: string }> = [{ id: selectedId, gender: individualById.get(selectedId)?.gender }];
        for (let g = 1; g <= maxAncestors; g++) {
            const nextGen: Array<{ id: string; gender?: string }> = [];
            const generationSpacing = maxHeight / Math.pow(2, g);

            for (const child of currentGen) {
                const childPos = ctx.positions[child.id];
                const fam = personToParentFamily.get(child.id);
                let fatherId: string | undefined; let motherId: string | undefined;
                if (fam && fam.parents && fam.parents.length) {
                    for (const pid of fam.parents) {
                        const p = individualById.get(pid);
                        if (!p) continue;
                        if (p.gender === 'M') fatherId = pid; else if (p.gender === 'F') motherId = pid;
                    }
                    // fallback ordering if gender info missing
                    if (!fatherId && fam.parents[0]) fatherId = fam.parents[0];
                    if (!motherId && fam.parents[1]) motherId = fam.parents[1];
                }
                // Position father above child, mother below, at fixed generation spacing
                if (fatherId && !ctx.positions[fatherId]) {
                    const y = childPos.y - generationSpacing / 2;
                    ctx.positions[fatherId] = { x: g * horizontalGap, y };
                    generationMap.set(fatherId, g);
                    nextGen.push({ id: fatherId, gender: individualById.get(fatherId)?.gender });
                    ctx.connections.push({ from: child.id, to: fatherId, genderHint: 'M' });
                }
                if (motherId && !ctx.positions[motherId]) {
                    const y = childPos.y + generationSpacing / 2;
                    ctx.positions[motherId] = { x: g * horizontalGap, y };
                    generationMap.set(motherId, g);
                    nextGen.push({ id: motherId, gender: individualById.get(motherId)?.gender });
                    ctx.connections.push({ from: child.id, to: motherId, genderHint: 'F' });
                }
            }
            if (!nextGen.length) break; // stop early if no further ancestors
            currentGen = nextGen;
        }

        // Compute bounds and shift y to positive coordinates with padding
        let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
        Object.values(ctx.positions).forEach(p => { if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; });
        if (!isFinite(minY)) minY = 0; if (!isFinite(maxY)) maxY = 0; if (!isFinite(minX)) minX = 0; if (!isFinite(maxX)) maxX = 0;
        const paddingY = 40;
        const yShift = -minY + paddingY;
        Object.keys(ctx.positions).forEach(id => { ctx.positions[id].y += yShift; });
        maxY += yShift;
        const width = maxX + horizontalGap + 120; // right padding
        const height = maxY + paddingY;

        const result: LayoutResult = {
            personPositions: ctx.positions,
            familyPositions: [],
            bounds: { width, height, minX, maxX: width, minY: paddingY, maxY: height },
            connections: ctx.connections.map(c => ({ from: c.from, to: c.to, kind: 'parent' }))
        };
        return result;
    }
}

export function computeAncestorLayout(
    individuals: any[],
    families: any[],
    selectedId: string | null,
    maxAncestors: number,
    horizontalGap?: number,
    boxHeight?: number,
    verticalGap?: number
) {
    const strategy = new AncestorTreeLayout();
    // levelOf not relevant here; provide empty map
    const levelOf = new Map<string, number>();
    if (selectedId) levelOf.set(selectedId, 0);
    return strategy.computeLayout(individuals, families, levelOf, {
        siblingGap: 0,
        parentGap: 0,
        familyPadding: 0,
        maxGenerationsForward: 0,
        maxGenerationsBackward: maxAncestors,
        maxAncestors,
        // pass through custom gaps
        ...(horizontalGap !== undefined ? { horizontalGap } : {}),
        ...(boxHeight !== undefined ? { boxHeight } : { boxHeight: 30 }),
        ...(verticalGap !== undefined ? { verticalGap } : {})
    } as any);
}
