import React, { useMemo } from 'react';
import type { TreeViewCommonProps, Individual } from './types';
import { AncestorTreeLayout } from './layouts/AncestorTreeLayout';

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

	const { personPositions, bounds, connections } = layout as any;

	React.useEffect(() => {
		try { onBounds && onBounds(bounds.width, bounds.height); } catch {}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [bounds?.width, bounds?.height]);

	function formatGedcomDateForDisplay(d: any) {
		if (!d) return null;
		return d.iso || d.approxIso || d.original || null;
	}

	const indById = new Map<string, Individual>(individuals.map(i => [i.id, i]));

	return (
		<div className="tree-view" style={{ position: 'relative', width: bounds.width, height: bounds.height }}>
			<svg
				className="family-connectors"
				viewBox={`0 0 ${bounds.width} ${bounds.height}`}
				style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: `${bounds.height}px`, pointerEvents: 'none' }}
			>
				{(connections || []).map((c: any, idx: number) => {
					const child = personPositions[c.from];
					const parent = personPositions[c.to];
					if (!child || !parent) return null;
					return (
						<line
							key={`conn-${idx}`}
							x1={`${child.x}`}
							y1={`${child.y}`}
							x2={`${parent.x}`}
							y2={`${parent.y}`}
							stroke="#666"
							strokeWidth={0.8}
						/>
					);
				})}
			</svg>

			{individuals.map(ind => {
				const p = personPositions[ind.id];
				if (!p) return null;
				const birth = formatGedcomDateForDisplay((ind as any).birthDate);
				const death = formatGedcomDateForDisplay((ind as any).deathDate);
				const dateLine = birth || death ? `${birth ? `b. ${birth}` : ''}${birth && death ? ' — ' : ''}${death ? `d. ${death}` : ''}` : null;
				const genderClass = ind.gender === 'M' ? 'male' : ind.gender === 'F' ? 'female' : 'unknown';
				return (
					<div
						key={ind.id}
						className={`person-box ${selectedId === ind.id ? 'selected' : ''} ${genderClass}`}
						style={{ left: `${p.x}px`, top: p.y, transform: 'translate(-50%, -50%)', position: 'absolute', width: boxWidth }}
						onClick={() => onSelectPerson?.(ind.id)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								onSelectPerson?.(ind.id);
							}
						}}
						role="button"
						tabIndex={0}
						aria-label={`${ind.name || ind.id}${dateLine ? `, ${dateLine}` : ''}`}
						data-person-id={ind.id}
						title={ind.name || ind.id}
					>
						<div className="person-name">{ind.name || ind.id}</div>
						{dateLine && <div className="person-dates">{dateLine}</div>}
						<div style={{ fontSize: 10, color: '#666' }}>{ind.id}</div>
					</div>
				);
			})}
		</div>
	);
};

export default AncestorTreeView;

