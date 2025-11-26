import React, { memo } from 'react';

interface FamilyBoxProps {
    id: string;
    position: { x: number; y: number };
    onSelect?: (id: string) => void;
    onRef: (el: HTMLDivElement | null) => void;
}

// Memoized FamilyBox to prevent unnecessary re-renders
export const FamilyBox = memo<FamilyBoxProps>(({
    id,
    position,
    onSelect,
    onRef
}) => {
    return (
        <div
            className="family-box"
            style={{ left: `${position.x}px`, top: position.y, transform: 'translate(-50%, -50%)', position: 'absolute' }}
            onClick={() => onSelect?.(id)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect?.(id);
                }
            }}
            title={id}
            role="button"
            tabIndex={0}
            aria-label={`Family ${id}`}
            ref={onRef}
            data-family-id={id}
        >
            {id}
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison - only re-render if these props change
    return (
        prevProps.id === nextProps.id &&
        prevProps.position.x === nextProps.position.x &&
        prevProps.position.y === nextProps.position.y
    );
});

FamilyBox.displayName = 'FamilyBox';
