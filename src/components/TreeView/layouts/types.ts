/**
 * Common types for tree layout strategies
 * Allows different layout algorithms (vertical, horizontal, radial, etc.)
 */

export interface LayoutConfig {
    siblingGap: number;
    parentGap: number;
    familyPadding: number;
    maxGenerationsForward: number;
    maxGenerationsBackward: number;
}

export interface LayoutResult {
    personPositions: Record<string, { x: number; y: number }>;
    familyPositions: Array<{
        id: string;
        x: number;
        y: number;
        parents: string[];
        children: string[];
    }>;
    bounds: {
        width: number;
        height: number;
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
}

export interface TreeLayoutStrategy {
    /**
     * Compute positions for all individuals and families
     */
    computeLayout(
        individuals: any[],
        families: any[],
        levelOf: Map<string, number>,
        config: LayoutConfig
    ): LayoutResult;
}
