import React from 'react';
import type { TreeViewCommonProps } from './types';
import { TreeView as UnifiedTreeView } from './TreeView';

interface AncestorTreeViewProps extends TreeViewCommonProps {
	// Prefer maxGenerationsBackward for consistency with vertical view
	maxGenerationsBackward?: number;
	// Deprecated alias kept for backward compatibility
	maxAncestors?: number;
	horizontalGap?: number;
	verticalGap?: number;
}

export const AncestorTreeView: React.FC<AncestorTreeViewProps> = (props) => {
	const { individuals, families = [], selectedId, onSelectPerson, onBounds, boxWidth = 140, boxHeight = 40, maxGenerationsBackward, maxAncestors = 5, horizontalGap = 180, verticalGap = 32 } = props;
	const effectiveBack = (typeof maxGenerationsBackward === 'number' ? maxGenerationsBackward : maxAncestors);
	return (
		<UnifiedTreeView
			layoutId="ancestor"
			individuals={individuals}
			families={families}
			selectedId={selectedId}
			onSelectPerson={onSelectPerson}
			onBounds={onBounds}
			boxWidth={boxWidth}
			boxHeight={boxHeight}
			maxGenerationsBackward={effectiveBack}
			// keep passing the alias for now (TreeView handles either)
			maxAncestors={effectiveBack}
			horizontalGap={horizontalGap}
			verticalGap={verticalGap}
		/>
	);
};

export default AncestorTreeView;

