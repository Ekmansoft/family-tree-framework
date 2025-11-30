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
    /** Optional: maximum ancestor generations for ancestor-oriented layouts */
    maxAncestors?: number;
    /** Horizontal spacing between columns or sibling groups */
    horizontalGap?: number;
    /** Box dimensions used by layout calculations */
    boxWidth?: number;
    boxHeight?: number;
    /** Vertical distances for family-centric vertical layout */
    familyToParentDistance?: number;
    familyToChildrenDistance?: number;
    /** Generic vertical gap used by ancestor layouts */
    verticalGap?: number;
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
    /** Optional connector list (child->parent, spouse links, etc.) */
    connections?: Array<{ from: string; to: string; kind?: 'parent' | 'spouse' }>;
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
