import React, { useState } from 'react';

export interface Family {
    id: string;
    parents?: string[];
    children?: string[];
    marriageDate?: any; // Parsed date object with original, iso, etc.
}

export interface Individual {
    id: string;
    name: string;
}

export interface RelationshipEditorProps {
    family: Family;
    individuals: Individual[];
    onSave: (updatedFamily: Family) => void;
    onCancel: () => void;
}

const RelationshipEditor: React.FC<RelationshipEditorProps> = ({ 
    family, 
    individuals,
    onSave, 
    onCancel 
}) => {
    const [parents, setParents] = useState<string[]>(family.parents || []);
    const [children, setChildren] = useState<string[]>(family.children || []);
    const [marriageDate, setMarriageDate] = useState(
        family.marriageDate?.iso || family.marriageDate?.original || ''
    );

    const handleSave = () => {
        onSave({
            ...family,
            parents,
            children,
            marriageDate: marriageDate ? { original: marriageDate, iso: marriageDate } : undefined
        });
    };

    const addParent = (personId: string) => {
        if (personId && !parents.includes(personId)) {
            setParents([...parents, personId]);
        }
    };

    const removeParent = (personId: string) => {
        setParents(parents.filter(p => p !== personId));
    };

    const addChild = (personId: string) => {
        if (personId && !children.includes(personId)) {
            setChildren([...children, personId]);
        }
    };

    const removeChild = (personId: string) => {
        setChildren(children.filter(c => c !== personId));
    };

    const getPersonName = (id: string) => {
        return individuals.find(i => i.id === id)?.name || id;
    };

    const availableParents = individuals.filter(i => !parents.includes(i.id));
    const availableChildren = individuals.filter(i => !children.includes(i.id));

    return (
        <div className="relationship-editor">
            <h2>Edit Family</h2>
            
            <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: '#666' }}>Family ID: {family.id}</p>
            </div>

            {/* Parents Section */}
            <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Parents/Spouses:
                </label>
                <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '4px', marginBottom: '8px' }}>
                    {parents.length === 0 ? (
                        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>No parents/spouses</p>
                    ) : (
                        <div>
                            {parents.map(pid => (
                                <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                                    <span>{getPersonName(pid)}</span>
                                    <button 
                                        onClick={() => removeParent(pid)}
                                        style={{ 
                                            background: '#dc3545', 
                                            color: 'white', 
                                            border: 'none', 
                                            padding: '4px 12px', 
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <select 
                    onChange={(e) => {
                        addParent(e.target.value);
                        e.target.value = '';
                    }}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    defaultValue=""
                >
                    <option value="" disabled>Add parent/spouse...</option>
                    {availableParents.map(person => (
                        <option key={person.id} value={person.id}>
                            {person.name} ({person.id})
                        </option>
                    ))}
                </select>
            </div>

            {/* Marriage Date */}
            <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    Marriage Date:
                </label>
                <input
                    type="date"
                    value={marriageDate}
                    onChange={(e) => setMarriageDate(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
            </div>

            {/* Children Section */}
            <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Children:
                </label>
                <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '4px', marginBottom: '8px' }}>
                    {children.length === 0 ? (
                        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>No children</p>
                    ) : (
                        <div>
                            {children.map(cid => (
                                <div key={cid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                                    <span>{getPersonName(cid)}</span>
                                    <button 
                                        onClick={() => removeChild(cid)}
                                        style={{ 
                                            background: '#dc3545', 
                                            color: 'white', 
                                            border: 'none', 
                                            padding: '4px 12px', 
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <select 
                    onChange={(e) => {
                        addChild(e.target.value);
                        e.target.value = '';
                    }}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    defaultValue=""
                >
                    <option value="" disabled>Add child...</option>
                    {availableChildren.map(person => (
                        <option key={person.id} value={person.id}>
                            {person.name} ({person.id})
                        </option>
                    ))}
                </select>
            </div>

            {/* Action Buttons */}
            <div className="editor-actions">
                <button onClick={handleSave}>Save Changes</button>
                <button onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
};

export default RelationshipEditor;