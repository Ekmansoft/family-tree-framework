import React from 'react';
import type { TreeViewCommonProps } from './types';
import { TreeView as UnifiedTreeView } from './TreeView';

interface AncestorTreeViewProps extends TreeViewCommonProps {
	horizontalGap?: number;
	verticalGap?: number;
}

export const AncestorTreeView: React.FC<AncestorTreeViewProps> = (props) => {
	const { individuals, families = [], selectedId, onSelectPerson, onBounds, boxWidth = 140, boxHeight = 40, maxGenerationsBackward = 5, horizontalGap = 180, verticalGap = 32 } = props;
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
			horizontalGap={horizontalGap}
			verticalGap={verticalGap}
		/>
	);
};

export default AncestorTreeView;

