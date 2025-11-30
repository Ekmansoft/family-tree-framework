import React from 'react';
import type { Individual, Family } from './types';
import { computeVerticalLayout } from './layouts/VerticalTreeLayout';
import { TreeView } from './TreeView';

interface VerticalTreeViewProps {
    individuals: Individual[];
    families?: Family[];
    selectedId?: string | null;
    onSelectPerson?: (id: string) => void;
    onSelectFamily?: (id: string) => void;
    siblingGap?: number;
    parentGap?: number;
    ancestorFamilyGap?: number;
    descendantFamilyGap?: number;
    familyPadding?: number;
    focusItem?: string | null;
    maxGenerationsForward?: number;
    maxGenerationsBackward?: number;
    selectedTreeIndex?: number;
    onPerformanceMetric?: (metricName: string, durationMs: number) => void;
    enableVirtualRendering?: boolean;
    onBounds?: (width: number, height: number) => void;
}

/**
 * VerticalTreeView - Top-to-bottom genealogy tree layout
 * 
 * Uses VerticalTreeLayout strategy to position families and individuals
 * in a traditional genealogy chart with generations flowing vertically.
 */
export const VerticalTreeView: React.FC<VerticalTreeViewProps> = (props) => {
    // For now, VerticalTreeView is a direct pass-through to TreeView
    // TreeView already implements the vertical layout logic
    // This wrapper exists for architectural consistency with AncestorTreeView
    return <TreeView {...props} />;
};

export default VerticalTreeView;
