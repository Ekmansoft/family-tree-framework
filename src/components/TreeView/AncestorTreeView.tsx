import React, { useRef } from 'react';
import type { Individual, Family } from './types';
import { computeAncestorLayout } from './layouts/AncestorTreeLayout';

interface AncestorTreeViewProps {
    individuals: Individual[];
    families?: Family[];
    selectedId?: string | null;
    onSelectPerson?: (id: string) => void;
    maxAncestors?: number;
    horizontalGap?: number;
    verticalGap?: number;
    boxWidth?: number;
    boxHeight?: number;
    onBounds?: (width: number, height: number) => void;
}

export const AncestorTreeView: React.FC<AncestorTreeViewProps> = ({
    individuals,
    families = [],
    selectedId,
    onSelectPerson,
    maxAncestors = 5,
    horizontalGap = 180,
    verticalGap = 24,
    boxWidth = 140,
    boxHeight = 40,
    onBounds
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const personEls = useRef(new Map<string, HTMLDivElement>());

    if (!selectedId) {
        return <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>Select a person to view their ancestor tree</div>;
    }

    const layout = computeAncestorLayout(individuals, families, selectedId, maxAncestors, horizontalGap, boxHeight, verticalGap);
    const positions = layout.personPositions;
    const totalWidth = layout.bounds.width;
    const totalHeight = layout.bounds.height;

    // Report bounds to parent
    React.useEffect(() => {
        try { onBounds && onBounds(totalWidth, totalHeight); } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalWidth, totalHeight]);

    // Prefer connections supplied by layout (includes placeholders)
    const rawConnections: Array<{ from: string; to: string; genderHint?: 'M' | 'F' | 'U' }> = (layout as any).connections || [];
    const connections: Array<{ fromPos: { x: number; y: number }; toPos: { x: number; y: number }; key: string; type: 'father' | 'mother' | 'unknown' }> = [];
    rawConnections.forEach(c => {
        const fromPos = positions[c.from];
        const toPos = positions[c.to];
        if (!fromPos || !toPos) return;
        let type: 'father' | 'mother' | 'unknown';
        if (c.genderHint === 'M') type = 'father'; else if (c.genderHint === 'F') type = 'mother'; else type = 'unknown';
        connections.push({
            fromPos: { x: fromPos.x + boxWidth, y: fromPos.y + boxHeight / 2 },
            toPos: { x: toPos.x, y: toPos.y + boxHeight / 2 },
            key: `${c.from}->${c.to}`,
            type
        });
    });

    const formatDate = (d: any) => {
        if (!d) return null;
        if (typeof d === 'string') return d;
        return d.iso || d.approxIso || d.original || null;
    };

    return (
        <div
            ref={containerRef}
            className="ancestor-tree-view"
            style={{ position: 'relative', width: totalWidth, minHeight: totalHeight, display: 'block' }}
        >
            <svg style={{ position: 'absolute', top: 0, left: 0, width: totalWidth, height: totalHeight, pointerEvents: 'none', overflow: 'visible' }}>
                {connections.map(c => (
                    <path
                        key={c.key}
                        d={`M ${c.fromPos.x} ${c.fromPos.y} C ${c.fromPos.x + 40} ${c.fromPos.y}, ${c.toPos.x - 40} ${c.toPos.y}, ${c.toPos.x} ${c.toPos.y}`}
                        stroke="#000"
                        strokeWidth={2}
                        fill="none"
                    />
                ))}
            </svg>
            {Object.keys(positions).map(pid => {
                const person: any = individuals.find(i => i.id === pid);
                const isPlaceholder = !person && pid.startsWith('placeholder_');
                if (!person && !isPlaceholder) return null;
                const p = positions[pid];
                const birth = person ? formatDate(person.birthDate) : null;
                const death = person ? formatDate(person.deathDate) : null;
                const dateLine = person && (birth || death) ? `${birth ? `b. ${birth}` : ''}${birth && death ? ' — ' : ''}${death ? `d. ${death}` : ''}` : null;
                const isSelected = pid === selectedId;
                const gender = person?.gender || (pid.includes('_F_') ? 'M' : pid.includes('_M_') ? 'F' : undefined);
                const genderColor = gender === 'M' ? '#e3f2fd' : gender === 'F' ? '#fce4ec' : '#f5f5f5';
                const borderColor = isSelected ? '#667eea' : (gender === 'M' ? '#90caf9' : gender === 'F' ? '#f48fb1' : '#bdbdbd');
                const label = isPlaceholder ? (gender === 'M' ? 'Unknown Father' : gender === 'F' ? 'Unknown Mother' : 'Unknown') : (person.name || pid);
                return (
                    <div
                        key={pid}
                        style={{ position: 'absolute', left: p.x, top: p.y, width: boxWidth, minHeight: boxHeight, background: isSelected ? '#667eea' : genderColor, color: isSelected ? 'white' : '#333', border: `2px solid ${borderColor}`, borderRadius: 8, padding: '8px 10px', cursor: isPlaceholder ? 'default' : 'pointer', boxShadow: isSelected ? '0 4px 12px rgba(102,126,234,0.4)' : '0 2px 6px rgba(0,0,0,0.1)', transition: 'all 0.2s ease', overflow: 'hidden', opacity: isPlaceholder ? 0.6 : 1 }}
                        onClick={() => { if (!isPlaceholder) onSelectPerson?.(pid); }}
                        onKeyDown={e => { if (!isPlaceholder && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelectPerson?.(pid); } }}
                        role={isPlaceholder ? undefined : 'button'}
                        tabIndex={isPlaceholder ? -1 : 0}
                        title={label + (dateLine ? ` (${dateLine})` : '')}
                        ref={el => { if (el) personEls.current.set(pid, el); else personEls.current.delete(pid); }}
                        data-person-id={pid}
                    >
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                        {dateLine && <div style={{ fontSize: 10, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dateLine}</div>}
                    </div>
                );
            })}
        </div>
    );
};

export default AncestorTreeView;
