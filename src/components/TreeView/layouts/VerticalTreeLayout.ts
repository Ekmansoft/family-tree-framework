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
        const { siblingGap, parentGap, familyPadding, maxGenerationsForward, maxGenerationsBackward } = config;
        
        // Build relationship maps
        const { childrenOf, parentsOf } = buildRelationshipMaps(families);
        
        // Calculate dimensions
        const rowHeight = 90;
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
        const singleWidth = 100;
        const personWidthMap = new Map<string, number>();
        individuals.forEach(ind => personWidthMap.set(ind.id, singleWidth));
        
        // Estimate tree width for dynamic sibling gap
        const estimatedTreeWidth = families.reduce((sum, f) => {
            const childCount = (f.children || []).length;
            return sum + childCount * 150;
        }, 0);
        const dynamicSiblingGap = estimatedTreeWidth > 5000 ? Math.max(8, siblingGap / 3) : siblingGap;
        
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
        
        const rootFamilies = families.filter((f: any) => {
            const parents: string[] = (f.parents || []).slice();
            return !parents.some((p: string) => childParentFamily.has(p));
        });
        
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
        
        // Layout all root families
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
        
        // Apply X offset to ensure positive space
        const { pos: finalPos, minX, maxX } = applyXOffset(pos, 100);
        
        // Build family positions
        const familyPositions: Array<{
            id: string;
            x: number;
            y: number;
            parents: string[];
            children: string[];
        }> = [];
        
        const validIndividualIds = new Set(individuals.map((i: any) => i.id));
        
        families.forEach((fam: any) => {
            const parents: string[] = (fam.parents || []).filter((pid: string) => validIndividualIds.has(pid));
            const kids = (fam.children || []).filter((cid: string) => validIndividualIds.has(cid));
            
            const parentPos = parents.map((pid: string) => finalPos[pid]).filter(Boolean);
            const childPos = kids.map((cid: string) => finalPos[cid]).filter(Boolean);
            
            if (parentPos.length === 0 && childPos.length === 0) return;
            
            const avg = (arr: { x: number; y: number }[]) => ({
                x: arr.reduce((s, a) => s + a.x, 0) / arr.length,
                y: arr.reduce((s, a) => s + a.y, 0) / arr.length
            });
            
            let familyX = totalTreeWidth / 2;
            let familyY = rowHeight;
            
            const parentLevels = parents.map((pid: string) => levelOf.get(pid)).filter((v): v is number => typeof v === 'number');
            
            if (parentPos.length > 0 && parentLevels.length > 0) {
                const pavg = avg(parentPos);
                familyX = pavg.x;
                const maxParentLevel = Math.max(...parentLevels);
                const familyRow = maxParentLevel * 2 + 1;
                familyY = familyRow * rowHeight + rowHeight / 2 + yOffset;
            } else if (childPos.length > 0) {
                const cavg = avg(childPos);
                familyX = cavg.x;
                familyY = cavg.y - rowHeight * 0.4;
            }
            
            familyPositions.push({ id: fam.id, x: familyX, y: familyY, parents, children: kids });
        });
        
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
