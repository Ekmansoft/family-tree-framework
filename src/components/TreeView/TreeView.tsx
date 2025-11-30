import React, { useMemo } from 'react';
import type { TreeViewCommonProps } from './types';
import { assignGenerations } from './utils/generationAssignment';
import { buildRelationshipMaps as buildChildParentMaps, filterByMaxTrees } from './utils/treeFiltering';
import { Renderer } from './Shared/Renderer';
import { VerticalTreeLayout } from './layouts/VerticalTreeLayout';
import { AncestorTreeLayout, computeAncestorLayout } from './layouts/AncestorTreeLayout';

interface UnifiedTreeViewProps extends TreeViewCommonProps {
  layoutId: 'vertical' | 'ancestor';
  // Vertical-specific configuration
  siblingGap?: number;
  parentGap?: number;
  familyPadding?: number;
  maxGenerationsForward?: number;
  maxGenerationsBackward?: number;
  onSelectFamily?: (id: string) => void;
  // Ancestor-specific configuration
  horizontalGap?: number;
  verticalGap?: number;
}

export const TreeView: React.FC<UnifiedTreeViewProps> = ({
  layoutId,
  individuals,
  families = [],
  selectedId,
  onSelectPerson,
  onSelectFamily,
  onBounds,
  boxWidth = 140,
  boxHeight = 40,
  siblingGap = 20,
  parentGap = 30,
  familyPadding = 8,
  maxGenerationsForward = 50,
  maxGenerationsBackward = 50,
  familyToParentDistance,
  familyToChildrenDistance,
  horizontalGap = 180,
  verticalGap = 16,
}) => {
  // First, restrict to the connected component containing the focus item (if any)
  const { individualsLocal: individualsLocalPre, familiesLocal: familiesLocalPre } = filterByMaxTrees({
    individuals,
    families,
    focusItemId: selectedId ?? undefined,
  });
  let individualsLocal = individualsLocalPre;
  let familiesLocal = familiesLocalPre;
  const individualsById = useMemo(() => new Map(individualsLocal.map(i => [i.id, i])), [individualsLocal]);

  const { childrenOf, parentsOf } = buildChildParentMaps(familiesLocal);

  const { levelOf } = assignGenerations({
    individualsLocal,
    familiesLocal,
    childrenOf,
    parentsOf,
    individualsById,
    focusItem: selectedId ?? null,
  });

  const effectiveFamilyToParentDistance = familyToParentDistance ?? boxHeight;
  const effectiveFamilyToChildrenDistance = familyToChildrenDistance ?? boxHeight;

  // Further restrict to only individuals within the requested generation window around the focus
  if (selectedId) {
    const visibleIds = new Set<string>();
    individualsLocal.forEach(i => {
      const lvl = levelOf.get(i.id);
      if (typeof lvl === 'number' && lvl <= maxGenerationsForward && lvl >= -maxGenerationsBackward) {
        visibleIds.add(i.id);
      }
    });
    individualsLocal = individualsLocal.filter(i => visibleIds.has(i.id));
    familiesLocal = familiesLocal.filter(f => (
      (f.parents || []).some((pid: string) => visibleIds.has(pid)) ||
      (f.children || []).some((cid: string) => visibleIds.has(cid))
    ));
  }

  const layout = useMemo(() => {
    if (layoutId === 'ancestor') {
      return computeAncestorLayout(
        individualsLocal,
        familiesLocal,
        selectedId ?? null,
        maxGenerationsBackward,
        horizontalGap,
        boxHeight,
        verticalGap
      );
    }
    const strategy = new VerticalTreeLayout();
    return strategy.computeLayout(
      individualsLocal,
      familiesLocal,
      levelOf,
      {
        siblingGap,
        parentGap,
        familyPadding,
        maxGenerationsForward,
        maxGenerationsBackward,
        simplePacking: true,
        boxWidth,
        boxHeight,
        horizontalGap: siblingGap,
        familyToParentDistance: effectiveFamilyToParentDistance,
        familyToChildrenDistance: effectiveFamilyToChildrenDistance,
      } as any
    );
  }, [
    layoutId,
    individualsLocal,
    familiesLocal,
    levelOf,
    siblingGap,
    parentGap,
    familyPadding,
    maxGenerationsForward,
    maxGenerationsBackward,
    boxWidth,
    boxHeight,
    effectiveFamilyToParentDistance,
    effectiveFamilyToChildrenDistance,
    selectedId,
    horizontalGap,
    verticalGap,
  ]);

  return (
    <Renderer
      individuals={individualsLocal}
      layout={layout as any}
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

export default TreeView;
 

