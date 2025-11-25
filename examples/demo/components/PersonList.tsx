import React from 'react';

interface PersonListProps {
    individuals: any[];
    personQuery: string;
    onPersonQueryChange: (query: string) => void;
    onPersonClick: (ind: any) => void;
}

export const PersonList: React.FC<PersonListProps> = ({
    individuals,
    personQuery,
    onPersonQueryChange,
    onPersonClick
}) => {
    const filteredIndividuals = individuals.filter((ind) => {
        if (!personQuery) return true;
        const q = personQuery.toLowerCase();
        return (ind.name || '').toLowerCase().includes(q) || (ind.id || '').toLowerCase().includes(q);
    }).slice(0, 200);

    return (
        <div style={{ width: 250, minWidth: 250, borderRight: '1px solid #ddd', paddingRight: 12, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input
                    placeholder="Search people..."
                    value={personQuery}
                    onChange={(e) => onPersonQueryChange(e.target.value)}
                    style={{ flex: 1, padding: '6px 8px' }}
                />
                <div style={{ fontSize: 12, color: '#666' }}>{individuals.length}</div>
            </div>
            <div style={{ maxHeight: 600, overflow: 'auto' }}>
                {filteredIndividuals.map((ind) => (
                    <div
                        key={ind.id}
                        onClick={() => onPersonClick(ind)}
                        style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                        title={ind.name}
                    >
                        <div style={{ fontSize: 13 }}>{ind.name || ind.id}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>{ind.id}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
