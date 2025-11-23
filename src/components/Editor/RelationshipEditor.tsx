import React, { useState } from 'react';

interface Relationship {
  id: string;
  type: string;
  personA: string;
  personB: string;
}

interface RelationshipEditorProps {
  relationships: Relationship[];
  onUpdate: (updatedRelationships: Relationship[]) => void;
}

const RelationshipEditor: React.FC<RelationshipEditorProps> = ({ relationships, onUpdate }) => {
  const [editedRelationships, setEditedRelationships] = useState<Relationship[]>(relationships);

  const handleChange = (id: string, field: keyof Relationship, value: string) => {
    const updatedRelationships = editedRelationships.map(rel => 
      rel.id === id ? { ...rel, [field]: value } : rel
    );
    setEditedRelationships(updatedRelationships);
  };

  const handleSave = () => {
    onUpdate(editedRelationships);
  };

  return (
    <div>
      <h2>Edit Relationships</h2>
      {editedRelationships.map(rel => (
        <div key={rel.id}>
          <label>
            Type:
            <input 
              type="text" 
              value={rel.type} 
              onChange={(e) => handleChange(rel.id, 'type', e.target.value)} 
            />
          </label>
          <label>
            Person A:
            <input 
              type="text" 
              value={rel.personA} 
              onChange={(e) => handleChange(rel.id, 'personA', e.target.value)} 
            />
          </label>
          <label>
            Person B:
            <input 
              type="text" 
              value={rel.personB} 
              onChange={(e) => handleChange(rel.id, 'personB', e.target.value)} 
            />
          </label>
        </div>
      ))}
      <button onClick={handleSave}>Save Changes</button>
    </div>
  );
};

export default RelationshipEditor;