import React from 'react';
import type { TreeViewCommonProps } from './types';
import { TreeView as UnifiedTreeView } from './TreeView';

interface AncestorTreeViewProps extends TreeViewCommonProps {
	horizontalGenerationGap?: number;
	verticalGap?: number;
}

export const AncestorTreeView: React.FC<AncestorTreeViewProps> = (props) => {
	const { individuals, families = [], selectedId, onSelectPerson, onBounds, boxWidth = 140, boxHeight = 40, maxGenerationsBackward = 5, horizontalGenerationGap = 180, verticalGap = 32 } = props;

	if (!selectedId) {
		return <div className="tree-view no-focus">Select a person to view ancestor tree</div>;
	}
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
			maxGenerationsBackward={maxGenerationsBackward}
			horizontalGenerationGap={horizontalGenerationGap}
			verticalGap={verticalGap}
		/>
	);
};

export default AncestorTreeView;

