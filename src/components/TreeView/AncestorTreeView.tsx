import React, { useMemo } from 'react';
import type { TreeViewCommonProps } from './types';
import { AncestorTreeLayout } from './layouts/AncestorTreeLayout';
import { Renderer } from './Shared/Renderer';

interface AncestorTreeViewProps extends TreeViewCommonProps {
	maxAncestors?: number;
	horizontalGap?: number;
	verticalGap?: number;
}

export const AncestorTreeView: React.FC<AncestorTreeViewProps> = ({
	individuals,
	families = [],
	selectedId,
	onSelectPerson,
	onBounds,
	boxWidth = 140,
	boxHeight = 40,
	maxAncestors = 5,
	horizontalGap = 180,
	verticalGap = 32,
}) => {
	const layout = useMemo(() => {
		const strategy = new AncestorTreeLayout();
		const levelOf = new Map<string, number>();
		if (selectedId) levelOf.set(selectedId, 0);
		return strategy.computeLayout(individuals, families, levelOf, {
			maxAncestors,
			horizontalGap,
			boxHeight,
			verticalGap,
		} as any);
	}, [individuals, families, selectedId, maxAncestors, horizontalGap, boxHeight, verticalGap]);

	return (
		<Renderer
			individuals={individuals}
			layout={layout as any}
			selectedId={selectedId}
			onSelectPerson={onSelectPerson}
			onBounds={onBounds}
			boxWidth={boxWidth}
			boxHeight={boxHeight}
			enableConnectorEdgeAlignment={false}
		/>
	);
};

export default AncestorTreeView;

