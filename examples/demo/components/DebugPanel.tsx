import React from 'react';

interface DebugPanelProps {
    individuals: any[];
    families: any[];
    showDebugPanel: boolean;
    onToggle: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
    individuals,
    families,
    showDebugPanel,
    onToggle
}) => {
    return (
        <div style={{ marginBottom: 12, padding: 8, background: '#fff', border: '1px solid #ddd' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showDebugPanel ? 8 : 0 }}>
                <strong>Debug: parsed GEDCOM</strong>
                <button onClick={onToggle} style={{ padding: '4px 8px', fontSize: 12 }}>
                    {showDebugPanel ? 'Hide' : 'Show'}
                </button>
                <span style={{ fontSize: 12, color: '#666' }}>
                    Individuals: {individuals.length} | Families: {families.length}
                </span>
            </div>
            {showDebugPanel && (
                <div style={{ maxHeight: 260, overflow: 'auto' }}>
                    <div style={{ marginTop: 8 }}>
                        <strong>Individuals list:</strong>
                        <ul>
                            {individuals.map((ind) => (
                                <li key={ind.id}>
                                    {ind.id}: {ind.name || '(no name)'}
                                    {(ind.birthDate || ind.deathDate) && (
                                        <span style={{ color: '#666', marginLeft: 8, fontSize: 12 }}>
                                            {ind.birthDate ? `b. ${ind.birthDate.iso || ind.birthDate.approxIso || ind.birthDate.original}` : ''}
                                            {ind.birthDate && ind.deathDate ? ' ' : ''}
                                            {ind.deathDate ? `d. ${ind.deathDate.iso || ind.deathDate.approxIso || ind.deathDate.original}` : ''}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div style={{ marginTop: 8 }}>
                        <strong>Families list:</strong>
                        <ul>
                            {families.map((f) => (
                                <li key={f.id}>{f.id}{f.children ? ` — ${f.children.length} children` : ''}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};
