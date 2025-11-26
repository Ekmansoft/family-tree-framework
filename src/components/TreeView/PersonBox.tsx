import React, { memo } from 'react';

// Inline date formatter with memoization
const dateCache = new Map<string, string | null>();
function formatGedcomDateForDisplay(d: any): string | null {
    if (!d) return null;
    const key = JSON.stringify(d);
    if (dateCache.has(key)) return dateCache.get(key)!;
    const result = d.iso || d.approxIso || d.original || null;
    dateCache.set(key, result);
    return result;
}

interface PersonBoxProps {
    id: string;
    name?: string;
    birthDate?: string;
    deathDate?: string;
    families?: any[];
    isSelected: boolean;
    position: { x: number; y: number };
    onSelect?: (id: string) => void;
    onRef: (el: HTMLDivElement | null) => void;
}

// Memoized PersonBox to prevent unnecessary re-renders
export const PersonBox = memo<PersonBoxProps>(({
    id,
    name,
    birthDate,
    deathDate,
    families,
    isSelected,
    position,
    onSelect,
    onRef
}) => {
    const birth = formatGedcomDateForDisplay(birthDate);
    const death = formatGedcomDateForDisplay(deathDate);
    const dateLine = birth || death 
        ? `${birth ? `b. ${birth}` : ''}${birth && death ? ' — ' : ''}${death ? `d. ${death}` : ''}` 
        : null;

    return (
        <div
            className={`person-box ${families && families.length ? 'parent' : 'standalone'} ${isSelected ? 'selected' : ''}`}
            style={{ left: `${position.x}px`, top: position.y, transform: 'translate(-50%, -50%)', position: 'absolute' }}
            onClick={() => onSelect?.(id)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect?.(id);
                }
            }}
            title={name || id}
            role="button"
            tabIndex={0}
            aria-label={`${name || id}${dateLine ? `, ${dateLine}` : ''}`}
            ref={onRef}
            data-person-id={id}
        >
            <div className="person-name">{name || id}</div>
            {dateLine && <div className="person-dates">{dateLine}</div>}
            <div style={{ fontSize: 10, color: '#666' }}>{id}</div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison - only re-render if these props change
    return (
        prevProps.id === nextProps.id &&
        prevProps.name === nextProps.name &&
        prevProps.birthDate === nextProps.birthDate &&
        prevProps.deathDate === nextProps.deathDate &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.position.x === nextProps.position.x &&
        prevProps.position.y === nextProps.position.y
    );
});

PersonBox.displayName = 'PersonBox';
