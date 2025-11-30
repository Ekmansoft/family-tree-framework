import React from 'react';
import './vertical.css';
import type { TreeViewCommonProps } from './types';
import { TreeView as UnifiedTreeView } from './TreeView';

interface VerticalTreeViewProps extends TreeViewCommonProps {
    onSelectFamily?: (id: string) => void;
    siblingGap?: number;
    parentGap?: number;
    ancestorFamilyGap?: number;
    descendantFamilyGap?: number;
    familyPadding?: number;
    maxGenerationsForward?: number;
    maxGenerationsBackward?: number;
    selectedTreeIndex?: number;
    onPerformanceMetric?: (metricName: string, durationMs: number) => void;
    enableVirtualRendering?: boolean;
    onBounds?: (width: number, height: number) => void;
}

export const VerticalTreeView: React.FC<VerticalTreeViewProps> = (props) => {
    const {
        individuals,
        families = [],
        selectedId,
        onSelectPerson,
        siblingGap = 20,
        parentGap = 20,
        familyPadding = 16,
        maxGenerationsForward = 2,
        maxGenerationsBackward = 2,
        boxWidth = 100,
        boxHeight = 40,
        familyToParentDistance,
        familyToChildrenDistance,
        onBounds
    } = props;

    return (
        <UnifiedTreeView
            layoutId="vertical"
            individuals={individuals}
            families={families}
            selectedId={selectedId}
            onSelectPerson={onSelectPerson}
            onBounds={onBounds}
            boxWidth={boxWidth}
            boxHeight={boxHeight}
            siblingGap={siblingGap}
            parentGap={parentGap}
            familyPadding={familyPadding}
            maxGenerationsForward={maxGenerationsForward}
            maxGenerationsBackward={maxGenerationsBackward}
            familyToParentDistance={familyToParentDistance}
            familyToChildrenDistance={familyToChildrenDistance}
        />
    );
};

export default VerticalTreeView;